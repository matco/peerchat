var websocket = require('websocket');
var http = require('http');
var peers = [];

//prototype
String.prototype.leftPad = function(length, pad) {
	//clone string
	var string = this + '';
	while(string.length < length) {
		string = pad + string;
	}
	return string;
};
Number.prototype.pad = function(length, pad) {
	return this.toString().leftPad(length, pad || '0');
};
Array.objectFilter = function(properties) {
	return function(object) {
		for(var property in properties) {
			if(properties.hasOwnProperty(property)) {
				var object_value = Function.isFunction(object[property]) ? object[property].call(object) : object[property];
				if(object_value !== properties[property]) {
					return false;
				}
			}
		}
		return true;
	};
};
Array.prototype.removeElement = function(element) {
	var index = this.indexOf(element);
	if(index !== -1) {
		this.splice(index, 1);
	}
};
Array.prototype.find = function(callback, thisArgument) {
	var i = 0, length = this.length;
	for(; i < length; i++) {
		var element = this[i];
		if(callback.call(thisArgument, element, i, this)) {
			return element;
		}
	}
	throw new Error('Unable to find element');
};
Date.prototype.toDisplay = function() {
	return this.getDate().pad(2) + '.' + (this.getMonth() + 1).pad(2) + '.' + this.getFullYear();
};
Date.prototype.toFullDisplay = function() {
	return this.toDisplay() + ' ' + this.getHours().pad(2) + ':' + this.getMinutes().pad(2) + ':' + this.getSeconds().pad(2);
};

//create http server
var server = http.createServer(function(request, response) {
	//nothing to do over http
});
server.listen(1337, function() {
	console.log('HTTP server listening on port 1337');
});

//create websocket server
var wss = new websocket.server({
	httpServer : server
});

function send_callback(error) {
	if(error) {
		console.error('Unable to send: ' + error);
	}
}

function get_peer(connection) {
	return peers.find(function(peer) {return peer.connection === connection;});
}

wss.on('request', function(request) {
	var connection = request.accept(null, request.origin);
	console.log(new Date().toFullDisplay() + ' New peer from ' + connection.remoteAddress);

	//add new peer to peers list
	var peer = {
		connection : connection
	}
	peers.push(peer);

	connection.on('message', function(message) {
		//process message
		console.log(new Date().toFullDisplay() + ' Message received ' + message.utf8Data);
		//process only utf-8 message
		if(message.type === 'utf8') {
			var content = JSON.parse(message.utf8Data);
			var other_peers = peers.filter(function(c) {return c.connection !== connection;});
			//some messages need special handling
			if(content.type === 'connection') {
				peer.user = content.user;
				//build list of other peers
				//return peers list to peer
				connection.send(JSON.stringify({type : 'connection', users : other_peers.map(function(peer) {return peer.user;})}));
				//broadcast message to all connected peers
				other_peers.forEach(function(c) {
					c.connection.send(message.utf8Data, send_callback);
				});
			}
			else if(content.type === 'call') {
				//send message to the recipient
				other_peers.filter(function(peer) {
					return peer.user.id === content.call.recipient || peer.user.id === content.call.caller;
				}).forEach(function(target) {
					target.connection.send(message.utf8Data, send_callback);
				});
			}
		}
	});

	connection.on('close', function(code) {
		console.log(new Date().toFullDisplay() + ' Peer disconnected with code ' + code);
		//remove it from peers list
		peers.removeElement(peer);
		//notify all others peers
		peers.forEach(function(c) {
			c.connection.send(JSON.stringify({type : 'connection', user : peer.user, action : 'logout'}), send_callback);
		});
	});
});
