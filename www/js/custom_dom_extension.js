WebSocket.prototype.sendObject = function(message) {
	this.send(JSON.stringify(message));
};
