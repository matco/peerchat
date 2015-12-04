'use strict';

function Bus() {
	this.enabled = true;
	this.paused = false;
	this.locked = false;
	this.listeners = [];
	this.onEvent;
}

Bus.prototype.disable = function() {
	this.enabled = false;
};
Bus.prototype.enable = function() {
	this.enabled = true;
};

Bus.prototype.lock = function() {
	this.locked = true;
};
Bus.prototype.unlock = function() {
	this.locked = false;
};

Bus.prototype.reset = function() {
	this.listeners.length = 0;
};
Bus.prototype.register = function(listener) {
	if(!this.locked) {
		this.listeners.push(listener);
	}
};
Bus.prototype.unregister = function(listener) {
	if(!this.locked) {
		this.listeners.removeElement(listener);
	}
};
Bus.prototype.isRegistered = function(listener) {
	return this.listeners.contains(listener);
};

(function() {
	var awainting_events = [];

	Bus.prototype.pause = function() {
		this.paused = true;
	};

	Bus.prototype.resume = function() {
		this.paused = false;
		awainting_events.forEach(Bus.prototype.dispatch, this);
		awainting_events.length = 0;
	};

	Bus.prototype.dispatch = function(event) {
		if(this.enabled) {
			if(!this.paused) {
				this.listeners.forEach(event.hit, event);
			}
			else {
				awainting_events.push(event);
			}
			if(this.onEvent) {
				this.onEvent(event);
			}
		}
	};
})();

/* bus events */
function BusEvent() {
}

BusEvent.prototype.hit = function(object) {
	var callbacks = this.getCallbacks();
	if(!callbacks && callbacks.isEmpty()) {
		throw new Error('Bus event must describe callbacks');
	}
	var i = 0, length = callbacks.length;
	for(; i < length; i++) {
		var callback = callbacks[i];
		if(object[callback]) {
			object[callback].call(object, this);
		}
	}
};