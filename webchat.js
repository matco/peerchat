'use strict';

var RTCPeerConnection = window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
var RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription || window.mozRTCSessionDescription
var RTCIceCandidate = window.RTCIceCandidate || window.webkitRTCIceCandidate || window.mozRTCIceCandidate
var getUserMedia = navigator.webkitGetUserMedia ? navigator.webkitGetUserMedia.bind(navigator) : navigator.mozGetUserMedia.bind(navigator);

//TODO improve this
function guid() {
	var uid = '';
	for(var i = 0; i < 16; i++) {
		uid += Math.floor(Math.random() * 16).toString(16);
	}
	return uid;
}

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
			user = {id : guid(), name : ''};
		}
		users.push(user);

		//fill username
		document.getElementById('connect')['username'].value = user.name;

		function get_username(user_id) {
			return users.find(Array.objectFilter({id : user_id})).name
		}

		//fill server based on current url
		var secure = window.location.protocol.contains('s');
		document.getElementById('server')['server'].value = (secure ? 'wss://' : 'ws://') + window.location.host;

		//UI helpers
		var UI = {};

		UI.ShowError = (function() {
			var error_timeout;
			var error_container = document.getElementById('error');

			function hide_error() {
				error_container.textContent = '';
			}

			function show_error(error, time) {
				if(error_timeout) {
					clearTimeout(error_timeout);
				}
				error_container.textContent = error;
				error_timeout = setTimeout(hide_error, time || 5000);
			}
		})();

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
			var that = this;
			//TODO create a closure containing file
			for(var i = 0; i < event.dataTransfer.files.length; i++) {
				var file = event.dataTransfer.files[i];
				//file must be read to be bundled inside a message
				var reader = new FileReader();
				reader.onloadstart = function() {
					that.querySelector('[data-binding="call-loading"]').style.visibility = 'visible';
				};
				reader.onerror = function() {
					show_error('Error while loading ' + file.name);
				};
				reader.onload = function() {
				};
				reader.onloadend = function(reader_event) {
					console.log(reader.result);
					//TODO missing a closure to retrieve file name
					var message = {
						emitter : user.id,
						type : 'file',
						filename : file.name,
						filetype : file.type,
						data : reader.result,
						time : new Date().toString()
					};
					console.log(JSON.stringify(message));
					that.call.channel.send(JSON.stringify(message));
					that.querySelector('[data-binding="call-messages"]').appendChild(draw_message(message));
					that.querySelector('[data-binding="call-loading"]').style.display = 'hidden';
				};
				reader.readAsBinaryString(file);
				//reader.readAsText(file);
				//reader.readAsArrayBuffer(file);
			}
			dragend.call(this);
		}
		//document.body.addEventListener('dragover', dragover);
		//document.body.addEventListener('drop', drop);

		function draw_message(message) {
			var message_ui = document.createFullElement('li');
			var time = new Date(message.time);
			var message_date_text = time.getHours().pad(2) + ':' + time.getMinutes().pad(2) + ':' + time.getSeconds().pad(2)
			message_ui.appendChild(document.createFullElement('time', {}, message_date_text));
			var is_emitter = message.emitter === user.id;
			var user_name = is_emitter ? 'You' : get_username(message.emitter);
			message_ui.appendChild(document.createFullElement('span', {'class' : 'user'}, user_name));
			//file message
			if(message.type === 'file') {
				if(is_emitter) {
					message_ui.appendChild(document.createFullElement('span', {'class' : 'message'}, 'Sending file ' + message.filename));
				}
				else {
					var reader = new FileReader();
					reader.onloadstart = function() {
						//UI.StartLoading();
					};
					reader.onerror = function() {
						show_error('Error while loading ' + file.name);
					};
					reader.onload = function(reader_event) {
						var link = reader.result;
						var message_content = document.createFullElement('span', {'class' : 'message'});
						if(message.filetype.contains('image')) {
							var message_image = document.createFullElement('img', {src : link, alt : message.filename, title : message.filename});
							message_content.appendChild(message_image);
						}
						else {
							message_content.appendChild(document.createTextNode('Incoming file'));
						}
						var message_download_file = document.createFullElement('a', {href : link, download : message.filename, style : 'margin-left: 5px;'}, 'Download');
						message_content.appendChild(message_download_file);
						message_ui.appendChild(message_content);
					};
					reader.onloadend = function() {
						//UI.StopLoading();
					};
					//TODO it is useless to convert base 64 string to blob to let the browser convert it again to base 64 while generating data url
					var bytes = Array.prototype.map.call(message.data, function(c) {return c.charCodeAt(0);});
					reader.readAsDataURL(new Blob([new Uint8Array(bytes)], {type : message.filetype}));
				}
			}
			//text message
			else {
				message_ui.appendChild(document.createFullElement('span', {'class' : 'message'}, message.data));
			}
			return message_ui;
		}

		function create_call_ui(call) {
			var call_ui = document.getElementById('call').cloneNode();
			call_ui.call = call;
			call_ui.id = call.id;
			//find penpal
			var penpal_id = user.id === call.caller ? call.recipient : call.caller;
			call_ui.querySelector('[data-binding="call-username"]').textContent = get_username(penpal_id);
			call_ui.querySelector('form').addEventListener(
				'submit',
				function(event) {
					Event.stop(event);
					var message = {
						emitter : user.id,
						type : 'text',
						data : this.message.value,
						time : new Date().toString()
					};
					call.channel.send(JSON.stringify(message));
					var message_ui = draw_message(message);
					call_ui.querySelector('[data-binding="call-messages"]').appendChild(message_ui);
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
			try {
				calls.find(function(call) {
					call.caller === this.user.id || call.recipient === this.user.id;
				}, this);
				console.error('There is already a call with user ' + this.user.name);
			}
			catch(exception) {
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

		function connect_signalisation(user) {

			socket = new WebSocket(server);
			socket.addEventListener(
				'message',
				function(event) {
					var signal = JSON.parse(event.data);
					console.log('signalisation message received', signal);
					//call related messages
					if(signal.type === 'call') {
						//call can be an incoming call or informations about an occuring call
						if(signal.hasOwnProperty('sdp')) {
							try {
								var call = calls.find(Array.objectFilter({id : signal.call.id}));
								//only caller needs to set remove description here
								if(call.caller === user.id) {
									console.log(signal.sdp);
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
									document.getElementById(call.id).querySelector('button').removeAttribute('disabled');
								}
							}
							catch(exception) {
								console.log(exception);
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
						if(signal.hasOwnProperty('candidate')) {
							try {
								var candidate = new RTCIceCandidate(signal.candidate);
								//find associated call
								var call = calls.find(Array.objectFilter({id : signal.call.id}));
								//call may have already been answered
								if(call.peer) {
									call.peer.addIceCandidate(candidate);
								}
								//if call has not been answered, candidate is stored temporarly in the call
								else {
									call.candidate = candidate;
								}
							}
							catch(exception) {
								console.log(exception.message);
							}
						}
					}
					//connection related messages
					else if(signal.type === 'connection') {
						//all current users
						if(signal.hasOwnProperty('users')) {
							users.pushAll(signal.users);
							signal.users.map(create_user).forEach(Node.prototype.appendChild, document.getElementById('users'));
							document.getElementById('disconnect').style.display = 'inline';
						}
						else if(signal.hasOwnProperty('user')) {
							var users_ui = document.getElementById('users');
							//arriving user
							if(signal.action === 'login') {
								users.push(signal.user);
								users_ui.appendChild(create_user(signal.user));
							}
							//leaving user
							else {
								users.removeElement(signal.user);
								var child = users_ui.children.find(function(child) {return child.user.id === signal.user.id});
								users_ui.removeChild(child);
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
					document.getElementById('connecting').style.display = 'none';
					document.getElementById('disconnect').style.display = 'inline';
					document.getElementById('status').src = 'images/bullet_green.png';
				}
			);

			socket.addEventListener(
				'error',
				function(event) {
					document.getElementById('error').textContent = 'Lost connection to signalisation server';
				}
			);

			socket.sendObject = function(message) {
				this.send(JSON.stringify(message));
			};
		}

		document.getElementById('server').addEventListener(
			'submit',
			function(event) {
				Event.stop(event);
				server = this['server'].value;
				document.getElementById('contacts').style.display = 'block';
				this.style.display = 'none';
			}
		);

		document.getElementById('connect').addEventListener(
			'submit',
			function(event) {
				Event.stop(event);
				user.name = this['username'].value;
				connect_signalisation(user);
				this.style.display = 'none';
				document.getElementById('connecting').style.display = 'inline';
			}
		);

		document.getElementById('disconnect').addEventListener(
			'click',
			function() {
				socket.close();
				document.getElementById('users').clear();
				document.getElementById('status').src = 'images/bullet_red.png';
				this.style.display = 'none';
				document.getElementById('connect').style.display = 'inline';
			}
		);

		document.getElementById('incoming_call_decline').addEventListener(
			'click',
			function(event) {
				document.getElementById('incoming_call').style.display = 'none';
			}
		);

		document.getElementById('incoming_call_answer').addEventListener(
			'click',
			function(event) {
				var incoming_call = document.getElementById('incoming_call');
				incoming_call.style.display = 'none';
				var call = incoming_call.call;
				//create peer
				add_peer(call);
				try {
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
				}
				catch(exception) {
					console.log(exception.message);
				}
				//add ice candidate if it has already been received
				if(call.candidate) {
					call.peer.addIceCandidate(call.candidate);
				}
			}
		);

		function place_call(user_id) {
			var call = {
				id : guid(),
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
			var peer = new RTCPeerConnection({iceServers : [{url : 'stun:stun.l.google.com:19302'}]}, {optional: [{DtlsSrtpKeyAgreement : true}, {RtpDataChannels : true}]});
			peer.onicecandidate = function(event) {
				if(event.candidate !== null) {
					console.log('peer ice candidate', event);
					socket.sendObject({type : 'call', candidate : event.candidate, call : sanitize_call(call)});
					//On Chrome, multiple ICE candidates are usually found, we only need one.
					peer.onicecandidate = null;
				}
			};
			peer.onopen = function() {
				console.log('peer open');
			};
			peer.ondatachannel = function(event) {
				console.log('peer channel');
				call.channel = event.channel;
				manage_channel(call);
			};
			peer.onconnection = function() {
				console.log('peer connection');
				/*var channel = peer.createDataChannel('configs', {});
				//channel.binaryType = 'blob';

				channel.onmessage = function(event) {
					console.log('channel on message ' + event);
					document.getElementById('transfer_user_files').appendChild(document.createFullElement('li', {}, event.data));
					if(event.data instanceof Blob) {
						console.log('file message (size ' + event.data.size + ')');
					}
					else {
						console.log('text message ' + event.data.size);
					}
				};

				channel.onopen = function() {
					channel.send('Hello');
				};*/
			};
			peer.onclosedconnection = function(event) {
				console.log('peer close connection');
			};
			peer.onaddstream = function(event) {
				console.log('peer add stream');
			};
			call.peer = peer;
		}

		function add_media(call) {
			//create fake stream to launch connection
			getUserMedia(
				{audio : true, fake : true},
				function(stream) {
					console.log('add stream on peer');
					call.peer.addStream(stream);

					function peer_got_description(description) {
						console.log('peer got description');
						call.peer.setLocalDescription(description);
						socket.sendObject({type : 'call', sdp : description, call : sanitize_call(call)});
					}

					function peer_didnt_get_description() {
						console.log('peer did not get description');
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
						document.getElementById(call.id).querySelector('button').removeAttribute('disabled');
					}
				},
				function(error) {
					console.log('getUserMedia error', error);
				}
			);
		}

		function manage_channel(call) {
			call.channel.onopen = function(event) {
				console.log('channel open', event);
				document.getElementById(call.id).style.display = 'block';
			};
			call.channel.onmessage = function(event) {
				//console.log('channel data', event);
				var message = JSON.parse(event.data);
				var message_ui = draw_message(message);
				that.querySelector('[data-binding="call-loading"]').style.visibility = 'visible';
				document.getElementById(call.id).querySelector('[data-binding="call-messages"]').appendChild(message_ui);
			};
			call.channel.onclose = function(event) {
				console.log('channel close', event);
				//document.getElementById(call.id).style.display = 'none';
			};
		}

		/*document.getElementById('transfer_data_ready').addEventListener(
			'click',
			function() {
				if(peer_is_caller) {
					console.log('connect data connection peer_is_caller');
					peer.connectDataConnection(5000, 5001);
				}
				else {
					console.log('connect data connection peer_is_ not caller');
					peer.connectDataConnection(5001, 5000);
				}
			}
		);*/
	}
);