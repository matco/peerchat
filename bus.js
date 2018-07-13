'use strict';

const awaiting_events = [];

class Bus {
	constructor() {
		this.enabled = true;
		this.paused = false;
		this.locked = false;
		this.listeners = [];
		this.onEvent;
	}
	disable() {
		this.enabled = false;
	}
	enable() {
		this.enabled = true;
	}
	lock() {
		this.locked = true;
	}
	unlock() {
		this.locked = false;
	}
	reset() {
		this.listeners.length = 0;
	}
	register(listener) {
		if(!this.locked) {
			this.listeners.push(listener);
		}
	}
	unregister(listener) {
		if(!this.locked) {
			this.listeners.removeElement(listener);
		}
	}
	isRegistered(listener) {
		return this.listeners.includes(listener);
	}
	pause() {
		this.paused = true;
	}
	resume() {
		this.paused = false;
		awaiting_events.forEach(Bus.prototype.dispatch, this);
		awaiting_events.length = 0;
	}
	dispatch(event) {
		if(this.enabled) {
			if(!this.paused) {
				this.listeners.forEach(event.hit, event);
			}
			else {
				awaiting_events.push(event);
			}
			if(this.onEvent) {
				this.onEvent(event);
			}
		}
	}
}

class BusEvent {
	constructor() {
	}
	hit(object) {
		const callbacks = this.getCallbacks();
		if(!callbacks && callbacks.isEmpty()) {
			throw new Error('Bus event must describe callbacks');
		}
		callbacks.filter(c => !!object[c]).forEach(c => object[c].call(object, this));
	}
}

export {Bus, BusEvent};
