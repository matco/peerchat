var http = require('http');
var ws = require('ws');
var url = require('url');
var fs = require('fs');
var path = require('path');
var peers = [];

var PORT = process.env.PORT || 1337;

//prototype
Array.prototype.removeElement = function(element) {
	var index = this.indexOf(element);
	if(index !== -1) {
		this.splice(index, 1);
	}
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
	console.log(new Date().toISOString() + ' New peer connected');

	//add new peer to peers list
	var peer = {
		connection : connection
	};
	peers.push(peer);

	connection.on('message', function(message, flags) {
		//process only text message
		if(!flags.binary) {
			console.log(new Date().toISOString() + ' Message received ' + message);
			var content = JSON.parse(message);
			switch(content.type) {
				case 'connection' :
					peer.user = content.user;
					//find other peers
					var other_peers = peers.filter(p => p.connection !== connection);
					//return peers list to peer
					var response = {type : 'connection', users : other_peers.map(p => p.user)};
					connection.send(JSON.stringify(response));
					//broadcast message to all other connected peers
					other_peers.forEach(p => p.connection.send(message, send_callback));
					break;
				case 'call' :
					//send message to recipient peer designated in the message
					var recipient = peers.find(p => p.user.id === content.recipient);
					recipient.connection.send(message, send_callback);
			}
		}
	});

	connection.on('close', function(code) {
		console.log(new Date().toISOString() + ' Peer disconnected with code ' + code);
		//remove it from peers list
		peers.removeElement(peer);
		//notify all others peers
		peers.forEach(function(p) {
			p.connection.send(JSON.stringify({type : 'connection', user : peer.user, action : 'logout'}), send_callback);
		});
	});
});
