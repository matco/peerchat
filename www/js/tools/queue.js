'use strict';

function QueueTask(block, context, parameters, synchronous, on_end) {
	this.block = block;
	this.context = context;
	this.parameters = parameters;
	//synchronous can be used for tasks that don't have any callback
	this.synchronous = synchronous;
	//callback triggered when this tasks has been done
	this.onEnd = on_end;
}

QueueTask.wait = function(time) {
	return new QueueTask(
		function(callback) {setTimeout(callback, time || 1000);}
	);
};

function Queue(options) {
	//max number of tasks running at the same time
	this.parallel = 1;
	//triggered when all the tasks have been done
	this.onEnd;

	for(var key in options) {
		if(options.hasOwnProperty(key)) {
			this[key] = options[key];
		}
	}

	this.paused = false;
	this.done = 0;
	this.running = 0;
	this.tasks = [];
}

Queue.prototype.run = function() {
	while(!this.paused && !this.tasks.isEmpty() && (!this.parallel || this.running < this.parallel)) {
		this.running++;
		var task = this.tasks.shift();
		if(Function.isFunction(task)) {
			//call task with callback as the last parameter
			task.call(undefined, this.rerun.bind(this));
		}
		else if(task.constructor === QueueTask) {
			var parameters = task.parameters ? task.parameters.slice() : [];
			//add callback as the last parameter for asynchronous tasks
			if(!task.synchronous) {
				if(task.onEnd) {
					var that = this;
					parameters.push(function() {
						//add custom call back
						task.onEnd.apply(undefined, arguments);
						//continue queue
						that.rerun();
					});
				}
				else {
					parameters.push(this.rerun.bind(this));
				}
			}
			task.block.apply(task.context, parameters);
			//for synchronous tasks, re run this method directly
			if(task.synchronous) {
				this.rerun();
			}
		}
		else if(task.constructor === Queue) {
			this.tasks.pushAll(task.tasks);
			this.rerun();
		}
		else {
			throw new Error('Task must be a Function, a QueueTask or a Queue');
		}
	}
};

Queue.prototype.rerun = function() {
	this.done++;
	this.running--;
	if(this.tasks.isEmpty()) {
		if(this.running === 0 && this.onEnd) {
			this.onEnd.call();
		}
	}
	else {
		this.run();
	}
};

Queue.prototype.add = function(task) {
	this.tasks.push(task);
	this.run();
	return this;
};

Queue.prototype.addAll = function(tasks) {
	this.tasks.pushAll(tasks);
	this.run();
	return this;
};

Queue.prototype.clear = function() {
	this.tasks = [];
};

Queue.prototype.pause = function() {
	this.paused = true;
};

Queue.prototype.resume = function() {
	this.paused = false;
	this.run();
};