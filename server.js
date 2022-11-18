const http = require('http');
const node_static = require('node-static');
const ws = require('ws');

const PORT = process.env.PORT || 1337;

const peers = [];

//prototype
Array.prototype.removeElement = function(element) {
	const index = this.indexOf(element);
	if(index !== -1) {
		this.splice(index, 1);
	}
};

const file = new node_static.Server('./www');

//create http server
const http_server = http.createServer(function(request, response) {
	request.addListener('end', function() {
		file.serve(request, response);
	}).resume();
}).listen(PORT);

//create websocket server
const websocket_server = new ws.Server({server: http_server});

function send_callback(error) {
	if(error) {
		console.error(`Unable to send: ${error}`);
	}
}

websocket_server.on('connection', function(connection) {
	console.log(`${new Date().toISOString()} New peer connected`);

	//add new peer to peers list
	const peer = {
		connection: connection
	};
	peers.push(peer);

	connection.on('message', function(message) {
		//process only text message
		if(typeof message === 'string') {
			console.log(`${new Date().toISOString()} Message received ${message}`);
			const content = JSON.parse(message);
			switch(content.type) {
				case 'connection' : {
					peer.user = content.user;
					//find other peers
					const other_peers = peers.filter(p => p.connection !== connection);
					//return peers list to peer
					const response = {type: 'connection', users: other_peers.map(p => p.user)};
					connection.send(JSON.stringify(response));
					//broadcast message to all other connected peers
					other_peers.forEach(p => p.connection.send(message, send_callback));
					break;
				}
				case 'call' : {
					//send message to recipient peer designated in the message
					const recipient = peers.find(p => p.user.id === content.recipient);
					recipient.connection.send(message, send_callback);
				}
			}
		}
	});

	connection.on('close', function(code) {
		console.log(`${new Date().toISOString()} Peer disconnected with code ${code}`);
		//remove it from peers list
		peers.removeElement(peer);
		//notify all others peers
		peers.forEach(function(p) {
			p.connection.send(JSON.stringify({type: 'connection', user: peer.user, action: 'logout'}), send_callback);
		});
	});
});
