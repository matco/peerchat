import './tools/extension.js';
import './tools/dom_extension.js';

import {UUID} from './tools/uuid.js';
import {UI} from './ui.js';

const CHUNK_SIZE = 100 * 1000;

let server;
let user;
let socket;
const users = [];
const calls = [];

window.addEventListener(
	'unload',
	function() {
		//save user
		sessionStorage.setObject('user', user);
	}
);

window.addEventListener(
	'load',
	function() {

		//restore user or create one
		if(sessionStorage.getItem('user')) {
			user = sessionStorage.getObject('user');
		}
		else {
			user = {id: UUID.Generate(), name: ''};
		}
		users.push(user);

		function get_username(user_id) {
			return users.find(u => u.id === user_id).name;
		}

		//fill login form
		const secure = window.location.protocol.includes('s');
		document.getElementById('connect')['server'].value = (secure ? 'wss://' : 'ws://') + window.location.host;
		document.getElementById('connect')['username'].value = user.name;

		function dragover(event) {
			event.stop();
			this.style.backgroundColor = '#ddd';
		}

		function dragend(event) {
			event.stop();
			this.style.backgroundColor = '';
		}

		function drop(event) {
			event.preventDefault();
			for(let i = 0; i < event.dataTransfer.files.length; i++) {
				const file = event.dataTransfer.files[i];
				//create new channel for file transfer
				const fileid = UUID.Generate();
				const call = calls.find(c => c.id === this.dataset.callId);
				const file_channel = call.peer.createDataChannel(fileid);
				call.files.push({channel: file_channel});
				const message = {
					emitter: user.id,
					type: 'file',
					fileid: fileid,
					filename: file.name,
					filetype: file.type,
					filesize: file.size,
					time: new Date().toString()
				};
				call.channel.send(JSON.stringify(message));
				const message_ui = draw_message(message);
				this.querySelector('[data-binding="call-messages"]').appendChild(message_ui);
				send_file(
					file_channel,
					file,
					0,
					function(offset) {
						message_ui.querySelector('progress').setAttribute('value', offset);
					},
					function(file) {
						//remove progress bar
						const progress = message_ui.querySelector('progress');
						progress.parentNode.removeChild(progress);
						//update message text
						message_ui.querySelector('span.message').textContent = `File ${file.name} sent`;
					}
				);
			}
			dragend.call(this);
		}

		function send_file(channel, file, offset, progression_callback, final_callback) {
			//file must be cut into small chunk which are read and bundled inside a message
			const chunk = file.slice(offset, offset += CHUNK_SIZE);
			const end = offset > file.size;

			const reader = new FileReader();
			reader.addEventListener(
				'error',
				function() {
					UI.ShowError(`Error while loading ${file.name}`, 5000);
				}
			);
			reader.addEventListener(
				'loadend',
				function(event) {
					//console.log(reader.result);
					channel.send(event.target.result);
					//continue with next chunk and call progression callback
					if(!end) {
						if(progression_callback) {
							progression_callback.call(null, offset);
						}
						//TODO improve this to avoid always passing callback parameters
						send_file(channel, file, offset, progression_callback, final_callback);
					}
					//call final callback
					else {
						if(final_callback) {
							final_callback.call(null, file);
						}
					}
				}
			);

			reader.readAsArrayBuffer(chunk);
		}

		function draw_message(message) {
			const message_ui = document.createFullElement('li');
			const time = new Date(message.time);
			const message_date_text = `${time.getHours().pad(2)}:${time.getMinutes().pad(2)}:${time.getSeconds().pad(2)}`;
			message_ui.appendChild(document.createFullElement('time', {}, message_date_text));
			const is_emitter = message.emitter === user.id;
			const user_name = is_emitter ? 'You' : get_username(message.emitter);
			message_ui.appendChild(document.createFullElement('span', {'class': 'user'}, user_name));
			//file message
			if(message.type === 'file') {
				//identify file ui
				message_ui.setAttribute('id', message.fileid);
				const message_content = document.createFullElement('span', {'class': 'message'});
				if(is_emitter) {
					message_content.appendChild(document.createTextNode(`Sending file ${message.filename}`));
				}
				else {
					message_content.appendChild(document.createTextNode(`Incoming file ${message.filename}`));
				}
				message_content.appendChild(document.createFullElement('progress', {value: 0, max: message.filesize}));
				message_ui.appendChild(message_content);
			}
			//text message
			else {
				message_ui.appendChild(document.createFullElement('span', {'class': 'message'}, message.data));
			}
			return message_ui;
		}

		function create_call_ui(call) {
			const call_ui = document.importNode(document.getElementById('call').content.firstElementChild, true);
			call_ui.dataset.callId = call.id;
			//find penpal
			const penpal_id = user.id === call.caller ? call.recipient : call.caller;
			call_ui.querySelector('[data-binding="call-username"]').textContent = get_username(penpal_id);
			call_ui.querySelector('form').addEventListener(
				'submit',
				function(event) {
					event.stop();
					//send message
					const message = {
						emitter: user.id,
						type: 'text',
						data: this.message.value,
						time: new Date().toString()
					};
					call.channel.send(JSON.stringify(message));
					//update ui
					call_ui.querySelector('[data-binding="call-messages"]').appendChild(draw_message(message));
					this.message.value = '';
				}
			);
			call_ui.querySelector('[data-binding="call-end"]').addEventListener(
				'click',
				function() {
					//call may not have been accepted by the recipient yet
					if(call.peer.connectionState !== 'connected') {
						//in this case, a message must be send through signalisation server to warn the recipient that the call is no longer valid
						socket.sendObject({type: 'call', action: 'cancel', recipient: call.recipient, call: sanitize_call(call)});
					}
					//in any case, close what must be closed and delete the call
					document.querySelector(`div[data-call-id="${call.id}"]`).remove();
					call.channel.close();
					call.peer.close();
					calls.removeElement(call);
				}
			);
			//manage file drop
			call_ui.addEventListener('dragover', dragover);
			call_ui.addEventListener('dragend', dragend);
			call_ui.addEventListener('drop', drop);
			//display call ui
			document.body.appendChild(call_ui);
			call_ui.style.opacity = '0.7';
		}

		function user_call() {
			//check if there is not already an existing call with this user
			const user = users.find(u => u.id === this.dataset.userId);
			const existing_call = calls.some(c => c.caller === user.id || c.recipient === user.id);
			if(existing_call) {
				UI.ShowError(`You're already chatting with ${user.name}`, 3000);
			}
			else {
				const call = place_call(user.id);
				create_call_ui(call);
			}
		}

		//TODO make a real class with properties not serialized
		function sanitize_call(call) {
			return {
				id: call.id,
				caller: call.caller,
				recipient: call.recipient,
				time: call.time,
				files: []
			};
		}

		function create_user(user) {
			const li = document.createFullElement('li', {'data-user-id': user.id}, user.name);
			li.addEventListener('click', user_call);
			return li;
		}

		async function handle_message(data) {
			const message = typeof data === 'string' ? data : await data.text();
			const signal = JSON.parse(message);
			console.log('signalisation message received', signal);
			switch(signal.type) {
				//call related messages
				case 'call': {
					//call can be an incoming call or information about an occurring call
					if(signal.hasOwnProperty('action')) {
						if(signal.action === 'decline') {
							const call = calls.find(c => c.id === signal.call.id);
							calls.removeElement(call);
							//disable ui
							document.querySelector(`div[data-call-id="${call.id}"]`).remove();
							//show message
							UI.ShowError(`${get_username(call.recipient)} declined your call`, 3000);
						}
						if(signal.action === 'cancel') {
							const call = calls.find(c => c.id === signal.call.id);
							//call may have already been terminated when data channel has been closed
							if(call) {
								calls.removeElement(call);
								//remove ui
								document.querySelector(`div[data-call-id="${call.id}"]`).remove();
							}
						}
					}
					else if(signal.hasOwnProperty('sdp')) {
						const call = calls.find(c => c.id === signal.call.id);
						//only caller needs to set remove description here
						if(call) {
							if(call.caller === user.id) {
								call.peer.setRemoteDescription(
									new RTCSessionDescription(signal.sdp),
									function() {
										//nothing to do in this case
									},
									function(error) {
										console.log(error);
									}
								);
								//activate ui
								document.querySelector(`div[data-call-id="${call.id}"]`).querySelectorAll('input,button').forEach(e => e.removeAttribute('disabled'));
							}
						}
						else {
							//console.log(exception);
							const call = signal.call;
							call.is_caller = false;
							call.sdp = signal.sdp;
							//add call to call list
							calls.push(call);
							//find username
							const incoming_call_ui = document.importNode(document.getElementById('incoming_call').content.firstElementChild, true);
							incoming_call_ui.dataset.callId = call.id;
							incoming_call_ui.querySelector('[data-binding="incoming-call-username"]').textContent = get_username(signal.call.caller);
							incoming_call_ui.querySelector('button[data-action="decline"]').addEventListener(
								'click',
								function() {
									incoming_call_ui.remove();
									calls.removeElement(call);
									socket.sendObject({type: 'call', action: 'decline', recipient: call.caller, call: sanitize_call(call)});
								}
							);
							incoming_call_ui.querySelector('button[data-action="answer"]').addEventListener(
								'click',
								function() {
									incoming_call_ui.remove();
									//create peer
									add_peer(call);
									//setRemoteDescription (RTCSessionDescription description, VoidFunction successCallback, RTCPeerConnectionErrorCallback failureCallback);
									call.peer.setRemoteDescription(
										new RTCSessionDescription(call.sdp),
										function() {
											add_data_channel(call);
										},
										function(error) {
											console.log(error);
										}
									);
									//add ice candidate if it has already been received
									if(call.candidate) {
										call.peer.addIceCandidate(call.candidate);
									}
								}
							);
							document.body.appendChild(incoming_call_ui);
						}
					}
					//ice candidate
					else if(signal.hasOwnProperty('candidate')) {
						const candidate = new RTCIceCandidate(signal.candidate);
						//find associated call
						const call = calls.find(c => c.id === signal.call.id);
						//call may have already been answered
						if(call.peer) {
							call.peer.addIceCandidate(candidate);
						}
						//if call has not been answered, candidate is stored temporarily in the call
						else {
							call.candidate = candidate;
						}
					}
					break;
				}
				//connection related messages
				case 'connection': {
					//all current users
					if(signal.hasOwnProperty('users')) {
						users.pushAll(signal.users);
						signal.users.map(create_user).forEach(Node.prototype.appendChild, document.getElementById('users').empty());
					}
					else if(signal.hasOwnProperty('user')) {
						const users_ui = document.getElementById('users');
						//arriving user
						if(signal.action === 'login') {
							users.push(signal.user);
							users_ui.appendChild(create_user(signal.user));
							UI.Notify(`${signal.user.name} logged in`);
						}
						//leaving user
						else {
							users.removeElement(signal.user);
							users_ui.querySelector(`[data-user-id="${signal.user.id}"]`).remove();
							UI.Notify(`${signal.user.name} left`);
						}
					}
					break;
				}
				//unknown messages
				default:
					console.error('Unknown type of message');
			}
		}

		function connect_signalisation() {
			socket = new WebSocket(server);
			socket.addEventListener(
				'message',
				function(event) {
					handle_message(event.data).catch(error => {
						UI.ShowError('Unable to handle message.');
						console.log(error);
					});
				}
			);

			socket.addEventListener(
				'open',
				function() {
					//send a hello message
					socket.sendObject({type: 'connection', action: 'login', user: user});
					//update ui
					document.getElementById('server').textContent = server;
					document.getElementById('username').textContent = user.name;
					document.getElementById('connect').style.display = 'none';
					document.querySelector('header').style.display = 'block';
					document.getElementById('contacts').style.display = 'block';
				}
			);

			socket.addEventListener(
				'error',
				function() {
					UI.ShowError('Lost connection to signalisation server. Please reload the page.');
				}
			);

			socket.addEventListener(
				'close',
				function() {
					//ends all calls and remove associated ui
					calls.slice().forEach(function(call) {
						//peer may not have been created yet if call is happening right now
						if(call.peer) {
							call.peer.close();
						}
						//same for channel
						if(call.channel) {
							call.channel.close();
						}
						document.querySelector(`div[data-call-id="${call.id}"]`).remove();
					});
					calls.length = 0;
					users.length = 0;
					//update ui
					document.getElementById('contacts').style.display = 'none';
					document.querySelector('header').style.display = 'none';
					document.getElementById('connect').style.display = 'block';
				}
			);

			socket.sendObject = function(message) {
				this.send(JSON.stringify(message));
			};
		}

		document.getElementById('connect').addEventListener(
			'submit',
			function(event) {
				event.stop();
				server = this['server'].value;
				user.name = this['username'].value;
				connect_signalisation();
			}
		);

		document.getElementById('disconnect').addEventListener(
			'click',
			function() {
				//close connection to signaling server
				socket.close();
			}
		);

		function place_call(user_id) {
			const call = {
				id: UUID.Generate(),
				is_caller: true,
				caller: user.id,
				recipient: user_id,
				time: new Date().getTime(),
				files: []
			};
			add_peer(call);
			add_data_channel(call);
			calls.push(call);
			return call;
		}

		function add_peer(call) {
			const peer = new RTCPeerConnection({iceServers: [{urls: ['stun:stun.l.google.com:19302']}]});
			peer.onicecandidate = function(event) {
				if(event.candidate !== null) {
					console.log('on peer ice candidate', event);
					//only caller choose ice candidate
					if(call.is_caller) {
						socket.sendObject({type: 'call', candidate: event.candidate, recipient: call.recipient, call: sanitize_call(call)});
						//multiple ICE candidates are usually found, only one is needed
						peer.onicecandidate = null;
					}
				}
			};
			peer.ondatachannel = function(event) {
				console.log('on peer channel', event);
				if(event.channel.label === 'chat') {
					call.channel = event.channel;
					manage_channel(call);
				}
				else {
					manage_file_channel(call, event.channel);
				}
			};
			peer.ontrack = function() {
				console.log('on peer add track');
			};
			call.peer = peer;
		}

		function add_data_channel(call) {
			function peer_got_description(description) {
				console.log('on peer got description', description);
				call.peer.setLocalDescription(description);
				//send sdp description to penpal
				socket.sendObject({type: 'call', sdp: description, recipient: call.is_caller ? call.recipient : call.caller, call: sanitize_call(call)});
			}

			function peer_didnt_get_description() {
				console.log('on peer did not get description');
			}

			if(call.is_caller) {
				console.log('create channel chat');
				//channel may need to be created before the offer
				call.channel = call.peer.createDataChannel('chat'); //, {reliable : false});
				manage_channel(call);
				//createOffer (RTCSessionDescriptionCallback successCallback, RTCPeerConnectionErrorCallback failureCallback, optional MediaConstraints constraints);
				call.peer.createOffer(peer_got_description, peer_didnt_get_description);
			}
			else {
				//createAnswer (RTCSessionDescriptionCallback successCallback, RTCPeerConnectionErrorCallback failureCallback, optional MediaConstraints constraints);
				call.peer.createAnswer(peer_got_description, peer_didnt_get_description);
				//create and activate ui
				create_call_ui(call);
				document.querySelector(`div[data-call-id="${call.id}"]`).querySelectorAll('input,button').forEach(e => e.removeAttribute('disabled'));
			}
		}

		function manage_file_channel(call, channel) {
			channel.onopen = function(event) {
				console.log('on file channel open', event);
			};
			channel.onmessage = function(event) {
				//retrieve reference to file in call
				const file = call.files[channel.label];
				//concatenate chunks together
				file.parts.push(new Blob([event.data]));
				const current_size = file.parts.map(p => p.size).reduce((accumulator, value) => accumulator + value);
				//retrieve ui
				const file_ui = document.getElementById(channel.label);
				const progress = file_ui.querySelector('progress');
				//create download link when the whole file has been transferred
				if(current_size === file.size) {
					channel.close();
					const blob = new Blob(file.parts, {type: file.type});
					const url = URL.createObjectURL(blob);
					//remove progress bar
					progress.parentNode.removeChild(progress);
					//update message text and add link download file
					const message_ui_message = file_ui.querySelector('span.message');
					message_ui_message.textContent = `File ${file.name} transferred`;
					const message_download_file = document.createFullElement('a', {href: url, download: file.name, style: 'margin-left: 5px;'}, 'Download');
					message_ui_message.appendChild(message_download_file);
					//do something with well known mime type
					if(file.type.includes('image')) {
						const message_image = document.createFullElement('img', {src: url, alt: file.name, title: file.name});
						message_ui_message.appendChild(message_image);
					}
				}
				else {
					progress.setAttribute('value', current_size);
				}
			};
			channel.onclose = function(event) {
				console.log('on file channel close', event);
			};
		}

		function manage_channel(call) {
			call.channel.onopen = function(event) {
				console.log('on channel open', event);
				document.querySelector(`div[data-call-id="${call.id}"]`).style.opacity = '1';
			};
			call.channel.onmessage = function(event) {
				const message = JSON.parse(event.data);
				//keep a hook on file message ui
				if(message.type === 'file') {
					call.files[message.fileid] = {
						name: message.filename,
						type: message.filetype,
						size: message.filesize,
						parts: []
					};
				}
				const message_ui = draw_message(message);
				document.querySelector(`div[data-call-id="${call.id}"]`).querySelector('[data-binding="call-messages"]').appendChild(message_ui);
				//document.getElementById(call.id).querySelector('[data-binding="call-loading"]').style.visibility = 'hidden';
			};
			call.channel.onclose = function(event) {
				console.log('on channel close', event);
				//disable ui
				const call_ui = document.querySelector(`div[data-call-id="${call.id}"]`);
				//the call ui may have been removed if the call never happened
				if(call_ui) {
					call_ui.querySelectorAll('input,button').forEach(e => e.setAttribute('disabled', 'disabled'));
					//show message
					const penpal_id = user.id === call.caller ? call.recipient : call.caller;
					UI.ShowError(`${get_username(penpal_id)} ended the call`, 5000);
				}
			};
		}
	}
);
