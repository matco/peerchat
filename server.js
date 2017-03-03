var http = require('http');
var static = require('node-static');
var ws = require('ws');

const PORT = process.env.PORT || 1337;

var peers = [];

//prototype
Array.prototype.removeElement = function(element) {
	var index = this.indexOf(element);
	if(index !== -1) {
		this.splice(index, 1);
	}
};

var file = new static.Server('./app');

//create http server
var http_server = http.createServer(function(request, response) {
	request.addListener('end', function() {
		file.serve(request, response);
	}).resume();
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
