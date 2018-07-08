'use strict';

function Assert(onsuccess, onfail, onbegin, onend, debug) {
	this.onsuccess = onsuccess;
	this.onfail = onfail;
	this.onbegin = onbegin;
	this.onend = onend;
	this.debug = debug || false;

	this.results = [];

	this.began = false;
	this.times = {};
	this.counters = {
		successes : 0,
		fails : 0
	};
}

Assert.prototype.begin = function() {
	this.times.start = new Date();
	this.began = true;

	//callback
	if(this.onbegin) {
		this.onbegin.call(this);
	}
};

Assert.prototype.end = function() {
	this.times.stop = new Date();

	//callback
	if(this.onend) {
		this.onend.call(this);
	}
};

Assert.prototype.getDuration = function() {
	return this.times.stop.getTime() - this.times.start.getTime();
};

Assert.prototype.getSuccessesNumber = function() {
	return this.counters.successes;
};

Assert.prototype.getFailsNumber = function() {
	return this.counters.fails;
};

Assert.prototype.getTotal = function() {
	return this.results.length;
};

Assert.prototype.globalize = function(object) {
	var hook = object || window;
	var methods = ['begin', 'end', 'success', 'fail', 'equal', 'notEqual', 'similar', 'notSimilar', 'defined', 'undefined', 'null', 'notNull', 'ok', 'notOk', 'doesThrow', 'doesNotThrow'];
	for(var i = methods.length - 1; i >= 0; i--) {
		var method = methods[i];
		hook[method] = this[method].bind(this);
	}
};

(function() {
	function log(success, message, specification) {
		var text = success ? 'Success' : 'Fail';
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

	Assert.prototype.success = function(message, specification) {
		check_has_begun.call(this);

		this.results.push({success : true, message : message, specification : specification});

		//increment counter
		this.counters.successes++;

		//log
		log.call(this, true, message, specification);

		//callback
		if(this.onsuccess) {
			this.onsuccess.call(undefined, message, specification);
		}
	};

	Assert.prototype.fail = function(message, specification) {
		check_has_begun.call(this);

		this.results.push({success : false, message : message, specification : specification});

		//increment counter
		this.counters.fails++;

		//log
		log.call(this, false, message, specification);

		//callback
		if(this.onfail) {
			this.onfail.call(undefined, message, specification);
		}
	};
})();

Assert.prototype.equal = function(actual, expected, message, specification) {
	actual === expected ? this.success(message, specification) : this.fail(message + ': Actual [' + actual + '] - Expected [' + expected + ']', specification);
};
Assert.prototype.notEqual = function(actual, notExpected, message, specification) {
	actual !== notExpected ? this.success(message, specification) : this.fail(message + ': Actual [' + actual + '] - Not expected [' + notExpected + ']', specification);
};

Assert.prototype.similar = function(actual, expected, message, specification) {
	Object.equals(actual, expected) ? this.success(message, specification) : this.fail(message + ': Actual [' + actual + '] - Expected [' + expected + ']', specification);
};
Assert.prototype.notSimilar = function(actual, notExpected, message, specification) {
	!Object.equals(actual, notExpected) ? this.success(message, specification) : this.fail(message + ': Actual [' + actual + '] - Not expected [' + notExpected + ']', specification);
};

Assert.prototype.defined = function(value, message, specification) {
	this.notEqual(value, undefined, message, specification);
};
Assert.prototype.undefined = function(value, message, specification) {
	this.equal(value, undefined, message, specification);
};

Assert.prototype.null = function(value, message, specification) {
	this.equal(value, null, message, specification);
};
Assert.prototype.notNull = function(value, message, specification) {
	this.notEqual(value, null, message, specification);
};

Assert.prototype.ok = function(assertion, message, specification) {
	this.equal(assertion, true, message, specification);
};
Assert.prototype.notOk = function(assertion, message, specification) {
	this.equal(assertion, false, message, specification);
};

Assert.prototype.doesThrow = function(block, exception_assert, message, specification) {
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
			var check = exception_assert.call(exception);
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
};

Assert.prototype.doesNotThrow = function(block, message, specification) {
	try {
		block.call();
		this.success(message || 'Code does not throw an exception', specification);
	}
	catch(exception) {
		this.fail(message + ': Code throws an exception: ' + exception, specification);
	}
};
