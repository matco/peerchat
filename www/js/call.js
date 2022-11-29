import {UUID} from './tools/uuid.js';

export class Call {
	peer = undefined;
	candidate = undefined;
	sdp = undefined;

	constructor(caller, recipient) {
		this.id = UUID.Generate();
		this.time = new Date().getTime();
		this.isCaller = true;
		this.caller = caller;
		this.recipient = recipient;
		this.files = [];
	}

	toObject() {
		return {
			id: this.id,
			time: this.time,
			caller: this.caller,
			recipient: this.recipient
		};
	}

	static fromObject(object) {
		const call = new Call(object.caller, object.recipient);
		call.id = object.id;
		call.isCaller = false;
		call.time = object.time;
		return call;
	}
}
