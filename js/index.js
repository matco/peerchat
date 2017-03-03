'use strict';

var CHUNK_SIZE = 100 * 1000;

var server;
var user;
var socket;
var users = [];
var calls = [];

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
			user = {id : UUID.Generate(), name : ''};
		}
		users.push(user);

		function get_username(user_id) {
			return users.find(Array.objectFilter({id : user_id})).name;
		}

		//fill login form
		var secure = window.location.protocol.contains('s');
		document.getElementById('connect')['server'].value = (secure ? 'wss://' : 'ws://') + window.location.host;
		document.getElementById('connect')['username'].value = user.name;

		function dragover(event) {
			Event.stop(event);
			this.style.backgroundColor = '#ddd';
		}

		function dragend(event) {
			Event.stop(event);
			this.style.backgroundColor = '';
		}

		function drop(event) {
			event.preventDefault();
			for(var i = 0; i < event.dataTransfer.files.length; i++) {
				var file = event.dataTransfer.files[i];
				var message = {
					emitter : user.id,
					type : 'file',
					filename : file.name,
					filetype : file.type,
					filesize : file.size,
					time : new Date().toString()
				};
				this.call.channel.send(JSON.stringify(message));
				var message_ui = draw_message(message);
				this.querySelector('[data-binding="call-messages"]').appendChild(message_ui);
				send_file(
					this.call.channel,
					file,
					0,
					function(offset) {
						message_ui.querySelector('progress').setAttribute('value', offset);
					},
					function(file) {
						//remove progress bar
						var progress = message_ui.querySelector('progress');
						progress.parentNode.removeChild(progress);
						//update message text
						message_ui.querySelector('span.message').textContent = 'File ' + file.name + ' sent';
					}
				);
			}
			dragend.call(this);
		}

		function send_file(channel, file, offset, progression_callback, final_callback) {
			//file must be cut into small chunk which are read and bundled inside a message
			var chunk = file.slice(offset, offset += CHUNK_SIZE);
			var end = offset > file.size;

			var reader = new FileReader();
			reader.onerror = function() {
				UI.ShowError('Error while loading ' + file.name, 5000);
			};
			reader.onloadend = function(event) {
				//console.log(reader.result);
				var message = {
					emitter : user.id,
					type : 'chunk',
					offset : offset,
					data : event.target.result,
					end : end,
					time : new Date().toString()
				};
				channel.send(JSON.stringify(message));
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
			};

			reader.readAsBinaryString(chunk);
		}

		function draw_message(message, callback) {
			var message_ui = document.createFullElement('li');
			var time = new Date(message.time);
			var message_date_text = time.getHours().pad(2) + ':' + time.getMinutes().pad(2) + ':' + time.getSeconds().pad(2);
			message_ui.appendChild(document.createFullElement('time', {}, message_date_text));
			var is_emitter = message.emitter === user.id;
			var user_name = is_emitter ? 'You' : get_username(message.emitter);
			message_ui.appendChild(document.createFullElement('span', {'class' : 'user'}, user_name));
			//file message
			if(message.type === 'file') {
				var message_content = document.createFullElement('span', {'class' : 'message'});
				if(is_emitter) {
					message_content.appendChild(document.createTextNode('Sending file ' + message.filename));
				}
				else {
					message_content.appendChild(document.createTextNode('Incoming file ' + message.filename));
				}
				message_content.appendChild(document.createFullElement('progress', {value : 0, max : message.filesize}));
				message_ui.appendChild(message_content);
			}
			//text message
			else {
				message_ui.appendChild(document.createFullElement('span', {'class' : 'message'}, message.data));
			}
			return message_ui;
		}

		function create_call_ui(call) {
			var call_ui = document.getElementById('call').cloneNode(true);
			call_ui.call = call;
			call_ui.id = call.id;
			//find penpal
			var penpal_id = user.id === call.caller ? call.recipient : call.caller;
			call_ui.querySelector('[data-binding="call-username"]').textContent = get_username(penpal_id);
			call_ui.querySelector('form').addEventListener(
				'submit',
				function(event) {
					Event.stop(event);
					//send message
					var message = {
						emitter : user.id,
						type : 'text',
						data : this.message.value,
						time : new Date().toString()
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
					call.channel.close();
					call.peer.close();
					calls.removeElement(call);
					document.body.removeChild(call_ui);
				}
			);
			//manage file drop
			call_ui.addEventListener('dragover', dragover);
			call_ui.addEventListener('dragend', dragend);
			call_ui.addEventListener('drop', drop);
			//display call ui
			document.body.appendChild(call_ui);
			call_ui.style.display = 'block';
		}

		function user_call() {
			//check if there is not already an existing call with this user
			var existing_call = calls.find(function(call) {
				return call.caller === this.user.id || call.recipient === this.user.id;
			}, this);
			if(existing_call) {
				UI.ShowError('You\'re already chatting with ' + this.user.name, 3000);
			}
			else {
				var call = place_call(this.user.id);
				create_call_ui(call);
			}
		}

		//TODO make a real class with properties not serialized
		function sanitize_call(call) {
			return {
				id : call.id,
				caller : call.caller,
				recipient : call.recipient,
				time : call.time
			};
		}

		function create_user(user) {
			var li = document.createFullElement('li', {}, user.name);
			li.user = user;
			li.addEventListener('click', user_call);
			return li;
		}

		function connect_signalisation() {

			socket = new WebSocket(server);
			socket.addEventListener(
				'message',
				function(event) {
					var signal = JSON.parse(event.data);
					console.log('signalisation message received', signal);
					//call related messages
					if(signal.type === 'call') {
						//call can be an incoming call or informations about an occurring call
						if(signal.hasOwnProperty('action')) {
							var call = calls.find(Array.objectFilter({id : signal.call.id}));
							//if call is not found, there is nothing to do, user has declined the call
							//only caller needs to set remote description here
							if(call && call.caller === user.id) {
								//disable ui
								document.getElementById(call.id).parentNode.removeChild(document.getElementById(call.id));
								//show message
								UI.ShowError(get_username(call.recipient) + ' declines your call', 3000);
							}
						}
						else if(signal.hasOwnProperty('sdp')) {
							var call = calls.find(Array.objectFilter({id : signal.call.id}));
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
									document.getElementById(call.id).querySelectorAll('input,button').forEach(HTMLElement.prototype.removeAttribute.callbackize('disabled'));
								}
							}
							else {
								//console.log(exception);
								var call = signal.call;
								call.is_caller = false;
								call.sdp = signal.sdp;
								//add call to call list
								calls.push(signal.call);
								//find username
								var username = get_username(signal.call.caller);
								document.getElementById('incoming_call_user').textContent = username;
								document.getElementById('incoming_call').call = call;
								document.getElementById('incoming_call').style.display = 'block';
							}
						}
						//ice candidate
						else if(signal.hasOwnProperty('candidate')) {
							var candidate = new RTCIceCandidate(signal.candidate);
							//find associated call
							var call = calls.find(Array.objectFilter({id : signal.call.id}));
							//call may have already been answered
							if(call.peer) {
								call.peer.addIceCandidate(candidate);
							}
							//if call has not been answered, candidate is stored temporarily in the call
							else {
								call.candidate = candidate;
							}
						}
					}
					//connection related messages
					else if(signal.type === 'connection') {
						//all current users
						if(signal.hasOwnProperty('users')) {
							users.pushAll(signal.users);
							signal.users.map(create_user).forEach(Node.prototype.appendChild, document.getElementById('users'));
						}
						else if(signal.hasOwnProperty('user')) {
							var users_ui = document.getElementById('users');
							//arriving user
							if(signal.action === 'login') {
								users.push(signal.user);
								users_ui.appendChild(create_user(signal.user));
								UI.Notify(signal.user.name + ' logged in');
							}
							//leaving user
							else {
								users.removeElement(signal.user);
								var child = users_ui.children.find(function(child) {return child.user.id === signal.user.id});
								users_ui.removeChild(child);
								UI.Notify(signal.user.name + ' left');
							}
						}
					}
					//unknown messages
					else {
						console.error('Unknown type of message');
					}
				}
			);

			socket.addEventListener(
				'open',
				function() {
					//send a hello message
					socket.sendObject({type : 'connection', action : 'login', user : user});
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

			socket.sendObject = function(message) {
				this.send(JSON.stringify(message));
			};
		}

		document.getElementById('connect').addEventListener(
			'submit',
			function(event) {
				Event.stop(event);
				server = this['server'].value;
				user.name = this['username'].value;
				connect_signalisation();
			}
		);

		document.getElementById('disconnect').addEventListener(
			'click',
			function() {
				//ends all calls and remove associated ui
				calls.forEach(function(call) {
					//peer may not have been created yet if call is happening right now
					if(call.peer) {
						call.peer.close();
					}
					//same for channel
					if(call.channel) {
						call.channel.close();
					}
					document.body.removeChild(document.getElementById(call.id));
				});
				//close connection to signaling server
				socket.close();
				//update ui
				document.getElementById('contacts').style.display = 'none';
				document.querySelector('header').style.display = 'none';
				document.getElementById('connect').style.display = 'block';
			}
		);

		document.getElementById('incoming_call_decline').addEventListener(
			'click',
			function() {
				var incoming_call = document.getElementById('incoming_call');
				incoming_call.style.display = 'none';
				var call = incoming_call.call;
				socket.sendObject({type : 'call', action : 'decline', recipient : call.caller, call : sanitize_call(call)});
			}
		);

		document.getElementById('incoming_call_answer').addEventListener(
			'click',
			function() {
				var incoming_call = document.getElementById('incoming_call');
				incoming_call.style.display = 'none';
				var call = incoming_call.call;
				//create peer
				add_peer(call);
				//setRemoteDescription (RTCSessionDescription description, VoidFunction successCallback, RTCPeerConnectionErrorCallback failureCallback);
				call.peer.setRemoteDescription(
					new RTCSessionDescription(call.sdp),
					function() {
						add_media(call);
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

		function place_call(user_id) {
			var call = {
				id : UUID.Generate(),
				is_caller : true,
				caller : user.id,
				recipient : user_id,
				time : new Date().getTime()
			};
			add_peer(call);
			add_media(call);
			calls.push(call);
			return call;
		}

		function add_peer(call) {
			var peer = new RTCPeerConnection({iceServers : [{urls : ['stun:stun.l.google.com:19302']}]});
			peer.onicecandidate = function(event) {
				if(event.candidate !== null) {
					console.log('on peer ice candidate', event);
					//only caller choose ice candidate
					if(call.is_caller) {
						socket.sendObject({type : 'call', candidate : event.candidate, recipient : call.recipient, call : sanitize_call(call)});
						//multiple ICE candidates are usually found, only one is needed
						peer.onicecandidate = null;
					}
				}
			};
			peer.onopen = function(event) {
				console.log('on peer open', event);
			};
			peer.ondatachannel = function(event) {
				console.log('on peer channel', event);
				call.channel = event.channel;
				manage_channel(call);
			};
			peer.onconnection = function(event) {
				console.log('on peer connection', event);
			};
			peer.onclosedconnection = function() {
				//disable ui
				document.getElementById(call.id).querySelectorAll('input,button').forEach(HTMLElement.prototype.setAttribute.callbackize('disabled', 'disabled'));
				//show error
				var penpal_id = user.id === call.caller ? call.recipient : call.caller;
				UI.ShowError(get_username(penpal_id) + ' ends the chat', 5000);
			};
			peer.ontrack = function() {
				console.log('on peer add track');
			};
			call.peer = peer;
		}

		function add_media(call) {
			function peer_got_description(description) {
				console.log('on peer got description', description);
				call.peer.setLocalDescription(description);
				//send sdp description to penpal
				socket.sendObject({type : 'call', sdp : description, recipient : call.is_caller ? call.recipient : call.caller, call : sanitize_call(call)});
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
				document.getElementById(call.id).querySelectorAll('input,button').forEach(HTMLElement.prototype.removeAttribute.callbackize('disabled'));
			}
		}

		var current_file_content;
		var current_file_message;
		var current_file_message_ui;

		function manage_channel(call) {
			call.channel.onopen = function(event) {
				console.log('on channel open', event);
				document.getElementById(call.id).style.display = 'block';
			};
			call.channel.onmessage = function(event) {
				var message = JSON.parse(event.data);
				//document.getElementById(call.id).querySelector('[data-binding="call-loading"]').style.visibility = 'visible';
				if(message.type === 'chunk') {
					//concatenate chunks together
					current_file_content.push(new Uint8Array(Array.prototype.map.call(message.data, function(c) {return c.charCodeAt(0);})));
					var progress = current_file_message_ui.querySelector('progress');
					//create download link when all data have arrived
					if(message.end) {
						var blob = new Blob(current_file_content, {type : current_file_message.filetype});
						var url = URL.createObjectURL(blob);
						//remove progress bar
						progress.parentNode.removeChild(progress);
						//update message text and add link download file
						var message_ui_message = current_file_message_ui.querySelector('span.message');
						message_ui_message.textContent = 'File ' + current_file_message.filename + ' transfered';
						var message_download_file = document.createFullElement('a', {href : url, download : current_file_message.filename, style : 'margin-left: 5px;'}, 'Download');
						message_ui_message.appendChild(message_download_file);
						//do something with well known mime type
						if(current_file_message.filetype.contains('image')) {
							var message_image = document.createFullElement('img', {src : url, alt : current_file_message.filename, title : current_file_message.filename});
							current_file_message_ui.appendChild(message_image);
						}
					}
					else {
						progress.setAttribute('value', (current_file_content.length - 1) * CHUNK_SIZE + current_file_content.last().length);
					}
				}
				else {
					var message_ui = draw_message(message);
					//keep a hook on file message ui
					if(message.type === 'file') {
						current_file_message = message;
						current_file_content = [];
						current_file_message_ui = message_ui;
					}
					document.getElementById(call.id).querySelector('[data-binding="call-messages"]').appendChild(message_ui);
					//document.getElementById(call.id).querySelector('[data-binding="call-loading"]').style.visibility = 'hidden';
				}
			};
			call.channel.onclose = function(event) {
				console.log('on channel close', event);
				//document.getElementById(call.id).style.display = 'none';
			};
		}
	}
);