'use strict';

function log(success, message, specification) {
	let text = success ? 'Success' : 'Fail';
	if(message) {
		text += ' : ';
		text += message;
		if(specification) {
			text += ' - ';
			text += specification;
		}
	}
	if(this.debug) {
		console.log(text);
	}
}

function check_has_begun() {
	if(!this.began) {
		throw new Error('Assert must be started before beginning testing');
	}
}

export class Assert {
	constructor(onsuccess, onfail, onbegin, onend, debug) {
		this.onsuccess = onsuccess;
		this.onfail = onfail;
		this.onbegin = onbegin;
		this.onend = onend;
		this.debug = debug || false;
		this.results = [];
		this.began = false;
		this.times = {};
		this.counters = {
			successes: 0,
			fails: 0
		};
	}
	begin() {
		this.times.start = new Date();
		this.began = true;
		//callback
		if(this.onbegin) {
			this.onbegin.call(this);
		}
	}
	end() {
		this.times.stop = new Date();
		//callback
		if(this.onend) {
			this.onend.call(this);
		}
	}
	getDuration() {
		return this.times.stop.getTime() - this.times.start.getTime();
	}
	getSuccessesNumber() {
		return this.counters.successes;
	}
	getFailsNumber() {
		return this.counters.fails;
	}
	getTotal() {
		return this.results.length;
	}
	globalize(object) {
		const hook = object || window;
		const methods = ['begin', 'end', 'success', 'fail', 'equal', 'notEqual', 'similar', 'notSimilar', 'defined', 'undefined', 'null', 'notNull', 'ok', 'notOk', 'doesThrow', 'doesNotThrow'];
		methods.forEach(method => hook[method] = this[method].bind(this));
	}
	success(message, specification) {
		check_has_begun.call(this);
		this.results.push({success: true, message: message, specification: specification});
		//increment counter
		this.counters.successes++;
		//log
		log.call(this, true, message, specification);
		//callback
		if(this.onsuccess) {
			this.onsuccess.call(undefined, message, specification);
		}
	}
	fail(message, specification) {
		check_has_begun.call(this);
		this.results.push({success: false, message: message, specification: specification});
		//increment counter
		this.counters.fails++;
		//log
		log.call(this, false, message, specification);
		//callback
		if(this.onfail) {
			this.onfail.call(undefined, message, specification);
		}
	}
	equal(actual, expected, message, specification) {
		actual === expected ? this.success(message, specification) : this.fail(message + ': Actual [' + actual + '] - Expected [' + expected + ']', specification);
	}
	notEqual(actual, notExpected, message, specification) {
		actual !== notExpected ? this.success(message, specification) : this.fail(message + ': Actual [' + actual + '] - Not expected [' + notExpected + ']', specification);
	}
	similar(actual, expected, message, specification) {
		Object.equals(actual, expected) ? this.success(message, specification) : this.fail(message + ': Actual [' + actual + '] - Expected [' + expected + ']', specification);
	}
	notSimilar(actual, notExpected, message, specification) {
		!Object.equals(actual, notExpected) ? this.success(message, specification) : this.fail(message + ': Actual [' + actual + '] - Not expected [' + notExpected + ']', specification);
	}
	defined(value, message, specification) {
		this.notEqual(value, undefined, message, specification);
	}
	undefined(value, message, specification) {
		this.equal(value, undefined, message, specification);
	}
	null(value, message, specification) {
		this.equal(value, null, message, specification);
	}
	notNull(value, message, specification) {
		this.notEqual(value, null, message, specification);
	}
	ok(assertion, message, specification) {
		this.equal(assertion, true, message, specification);
	}
	notOk(assertion, message, specification) {
		this.equal(assertion, false, message, specification);
	}
	doesThrow(block, exception_assert, message, specification) {
		try {
			block.call();
			this.fail(message || 'Code does not throw an exception', specification);
		}
		catch(exception) {
			if(!exception_assert) {
				this.success(message || 'Code throws an exception', specification);
			}
			//check exception matches criteria
			else {
				const check = exception_assert.call(exception);
				if(check === undefined) {
					this.fail(message + ': Exception assert must return a boolean', specification);
				}
				else if(check) {
					this.success(message || 'Code throws an exception matching criteria', specification);
				}
				else {
					this.fail(message + ': Code does not throw the good exception: Actual [' + exception + ']', specification);
				}
			}
		}
	}
	doesNotThrow(block, message, specification) {
		try {
			block.call();
			this.success(message || 'Code does not throw an exception', specification);
		}
		catch(exception) {
			this.fail(message + ': Code throws an exception: ' + exception, specification);
		}
	}
}
