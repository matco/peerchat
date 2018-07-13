'use strict';

export class DBConnector {
	constructor(name, keypath) {
		this.name = name;
		this.keypath = keypath;
		this.database;
	}
	isOpen() {
		return !!this.database;
	}
	open(callback) {
		const version = 1;
		const that = this;
		const request = indexedDB.open(this.name, version);
		request.addEventListener('upgradeneeded', function(event) {
			const db = event.target.result;
			//delete old store
			if(db.objectStoreNames.contains(that.name)) {
				db.deleteObjectStore(that.name);
			}
			//create new store
			db.createObjectStore(that.name, {keyPath: that.keypath});
		});
		//onsuccess is called after onupgradeneeded
		request.addEventListener('success', function(event) {
			//store handle to database
			that.database = event.target.result;
			//add error handler directly to the db to catch all errors
			that.database.addEventListener('error', function(event) {
				console.log('Uncatched general error with database: ' + event.target.errorCode, event);
			});
			that.database.addEventListener('abort', function(event) {
				console.log('Uncatched abort error with database: ' + event.target.errorCode, event);
			});
			if(callback) {
				callback.call(undefined, that.database);
			}
		});
		request.addEventListener('error', function(event) {
			//user did not allow to use IndexedDB
			console.log('Use of IndexedDB not allowed', event);
		});
	}
	drop(callback) {
		const request = indexedDB.deleteDatabase(this.name);
		//enabling this callback avoid success callback to be called in Chrome and Firefox
		/*request.addEventListener('error', function(event) {
			console.error('Error while deleting database ' + that.name, event);
		});*/
		request.addEventListener('success', function(event) {
			if(callback) {
				callback.call(undefined, event);
			}
		});
	}
	add(item, callback) {
		const that = this;
		//start transaction
		const transaction = this.database.transaction([this.name], 'readwrite');
		transaction.addEventListener('error', function(event) {
			console.error('Error with transaction while adding item ' + item[that.keypath], event);
		});
		transaction.addEventListener('abort', function(event) {
			console.error('Transaction aborted while adding item ' + item[that.keypath], event);
		});
		//retrieve store
		const store = transaction.objectStore(this.name);
		//do request
		const request = store.put(item);
		request.addEventListener('error', function(event) {
			console.error('Error with request while adding item ' + item[that.keypath], event);
		});
		request.addEventListener('success', function(event) {
			if(callback) {
				callback.call(undefined, event);
			}
		});
	}
	addAll(items, callback) {
		if(items.length === 0) {
			if(callback) {
				callback.call();
			}
		}
		else {
			const that = this;
			this.add(items[0], function() {
				that.addAll(items.slice(1), callback);
			});
		}
	}
	get(item_id, callback) {
		//start transaction
		const transaction = this.database.transaction([this.name]);
		transaction.addEventListener('error', function(event) {
			console.error('Error with transaction while retrieving item ' + item_id, event);
		});
		transaction.addEventListener('abort', function(event) {
			console.error('Transaction aborted while retrieving item ' + item_id, event);
		});
		//retrieve store
		const store = transaction.objectStore(this.name);
		//do request
		const request = store.get(item_id);
		request.addEventListener('error', function(event) {
			console.error('Error with request while retrieving item ' + item_id, event);
		});
		request.addEventListener('success', function(event) {
			if(callback) {
				callback.call(undefined, event.target.result);
			}
		});
	}
	getAll(callback) {
		//start transaction
		const transaction = this.database.transaction([this.name]);
		transaction.addEventListener('error', function(event) {
			console.error('Error with transaction while retrieving items', event);
		});
		transaction.addEventListener('abort', function(event) {
			console.error('Transaction aborted while retrieving items', event);
		});
		//retrieve store
		const store = transaction.objectStore(this.name);
		//do request
		const request = store.getAll();
		request.addEventListener('error', function(event) {
			console.error('Error with request while retrieving items', event);
		});
		request.addEventListener('success', function(event) {
			if(callback) {
				callback.call(undefined, event.target.result);
			}
		});
	}
	getSome(filter, callback) {
		this.getAll(function(results) {
			//apply filter on results if needed
			const items = filter ? results.filter(filter) : results;
			callback.call(undefined, items);
		});
	}
	remove(item_id, callback) {
		//start transaction
		const transaction = this.database.transaction([this.name], 'readwrite');
		transaction.addEventListener('error', function(event) {
			console.error('Error with transaction while removing item ' + item_id, event);
		});
		transaction.addEventListener('abort', function(event) {
			console.error('Transaction aborted while removing item ' + item_id, event);
		});
		//retrieve store
		const store = transaction.objectStore(this.name);
		//do request
		const request = store.delete(item_id);
		request.addEventListener('error', function(event) {
			console.error('Error with request while removing item ' + item_id, event);
		});
		request.addEventListener('success', function(event) {
			if(callback) {
				callback.call(undefined, event.target.result);
			}
		});
	}
	removeAll(callback) {
		this.removeSome(undefined, callback);
	}
	removeSome(filter, callback) {
		let deleted_items_number = 0;
		const that = this;
		this.getSome(filter, function(items) {
			//delete filtered items
			const length = items.length;
			if(length > 0) {
				for(let i = 0; i < length; i++) {
					const item = items[i];
					that.remove(item[that.keypath], function() {
						deleted_items_number++;
						//call callback when this and all other items have been deleted
						if(deleted_items_number === length && callback) {
							callback.call();
						}
					});
				}
			}
			else if(callback) {
				callback.call();
			}
		});
	}
}
