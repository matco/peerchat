'use strict';

class QueueTask {
	constructor(block, context, parameters, synchronous, on_end) {
		this.block = block;
		this.context = context;
		this.parameters = parameters;
		//synchronous can be used for tasks that don't have any callback
		this.synchronous = synchronous;
		//callback triggered when this tasks has been done
		this.onEnd = on_end;
	}
	static wait(time) {
		return new QueueTask((callback) => setTimeout(callback, time || 1000));
	}
}

class Queue {
	constructor(options) {
		//max number of tasks running at the same time
		this.parallel = 1;
		//triggered when all the tasks have been done
		this.onEnd;
		for(const key in options) {
			if(options.hasOwnProperty(key)) {
				this[key] = options[key];
			}
		}
		this.paused = false;
		this.done = 0;
		this.running = 0;
		this.tasks = [];
	}
	run() {
		while(!this.paused && !this.tasks.isEmpty() && (!this.parallel || this.running < this.parallel)) {
			this.running++;
			const task = this.tasks.shift();
			if(Function.isFunction(task)) {
				//call task with callback as the last parameter
				task.call(undefined, this.rerun.bind(this));
			}
			else if(task.constructor === QueueTask) {
				const parameters = task.parameters ? task.parameters.slice() : [];
				//add callback as the last parameter for asynchronous tasks
				if(!task.synchronous) {
					if(task.onEnd) {
						const that = this;
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
	}
	rerun() {
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
	}
	add(task) {
		this.tasks.push(task);
		this.run();
		return this;
	}
	addAll(tasks) {
		this.tasks.pushAll(tasks);
		this.run();
		return this;
	}
	clear() {
		this.tasks = [];
	}
	pause() {
		this.paused = true;
	}
	resume() {
		this.paused = false;
		this.run();
	}
}

export {Queue, QueueTask};
