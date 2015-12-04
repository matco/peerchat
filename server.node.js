var http = require('http');
var ws = require('ws');
var url = require('url');
var fs = require('fs');
var path = require('path');
var peers = [];

var PORT = process.env.PORT || 1337;

if(!Function.isFunction) {
	Function.isFunction = function(object) {
		return {}.toString.call(object) === '[object Function]';
	};
}
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
				//if object property is a function, call it only if the asked value is not a function too
				var object_value = Function.isFunction(object[property]) && !Function.isFunction(properties[property]) ? object[property].call(object) : object[property];
				if(object_value !== properties[property]) {
					return false;
				}
			}
		}
		return true;
	};
};
Array.objectMap = function(property) {
	return function(object) {
		return Function.isFunction(object[property]) ? object[property].call(object) : object[property];
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
	return undefined;
};
Date.prototype.toDisplay = function() {
	return this.getDate().pad(2) + '.' + (this.getMonth() + 1).pad(2) + '.' + this.getFullYear();
};
Date.prototype.toFullDisplay = function() {
	return this.toDisplay() + ' ' + this.getHours().pad(2) + ':' + this.getMinutes().pad(2) + ':' + this.getSeconds().pad(2);
};

//create http server
var http_server = http.createServer(function(request, response) {
	var href = url.parse(request.url, true);

	var filename = href.pathname.substring(1);

	if(!filename) {
		response.statusCode = 301;
		response.setHeader('Location', 'index.html');
		response.end('Nothing here');
	}

	if(filename.match(/(\w|\.|\/)*/i)) {
		fs.exists(filename, function(exists) {
			if(exists) {
				fs.stat(filename, function(error, stats) {
					if(stats.isFile()) {
						var stream = fs.createReadStream(filename);

						var mime_types = {
							'html' : 'text/html',
							'png': 'image/png',
							'js': 'text/javascript',
							'css': 'text/css'
						};
						var mime_type = mime_types[path.extname(filename).substring(1)];

						response.setHeader('Content-Type', mime_type);
						response.statusCode = 200;
						stream.pipe(response);
					}
					else {
						response.statusCode = 403;
						response.end(JSON.stringify({status : 'error', message : 'Only files can be requested'}));
					}
				});
			}
		});
	}
	else {
		response.statusCode = 404;
		response.end(JSON.stringify({status : 'error', message : 'File does not exists ' + filename}));
	}
}).listen(PORT);

//create websocket server
var websocket_server = new ws.Server({server : http_server});

function send_callback(error) {
	if(error) {
		console.error('Unable to send: ' + error);
	}
}

websocket_server.on('connection', function(connection) {
	console.log(new Date().toFullDisplay() + ' New peer connected');

	//add new peer to peers list
	var peer = {
		connection : connection
	};
	peers.push(peer);

	connection.on('message', function(message, flags) {
		//process only text message
		if(!flags.binary) {
			console.log(new Date().toFullDisplay() + ' Message received ' + message);
			var content = JSON.parse(message);
			switch(content.type) {
				case 'connection' :
					peer.user = content.user;
					//find other peers
					var other_peers = peers.filter(function(p) {
						return p.connection !== connection;
					});
					//return peers list to peer
					var response = {type : 'connection', users : other_peers.map(Array.objectMap('user'))};
					connection.send(JSON.stringify(response));
					//broadcast message to all other connected peers
					other_peers.forEach(function(p) {
						p.connection.send(message, send_callback);
					});
					break;
				case 'call' :
					//send message to recipient peer designated in the message
					var recipient = peers.find(function(p) {
						return p.user.id === content.recipient;
					});
					recipient.connection.send(message, send_callback);
			}
		}
	});

	connection.on('close', function(code) {
		console.log(new Date().toFullDisplay() + ' Peer disconnected with code ' + code);
		//remove it from peers list
		peers.removeElement(peer);
		//notify all others peers
		peers.forEach(function(p) {
			p.connection.send(JSON.stringify({type : 'connection', user : peer.user, action : 'logout'}), send_callback);
		});
	});
});
