'use strict';

function DBConnector(name, keypath) {
	this.name = name;
	this.keypath = keypath;
	this.database;
}

DBConnector.prototype.isOpen = function() {
	return !!this.database;
};

DBConnector.prototype.open = function(callback) {
	var version = 1;
	var that = this;

	var request = indexedDB.open(this.name, version);
	request.addEventListener('upgradeneeded', function(event) {
		var db = event.target.result;

		//delete old store
		if(db.objectStoreNames.contains(that.name)) {
			db.deleteObjectStore(that.name);
		}

		//create new store
		db.createObjectStore(that.name, {keyPath : that.keypath});
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
};

DBConnector.prototype.drop = function() {
	indexedDB.deleteDatabase(this.name);
};

DBConnector.prototype.add = function(item, callback) {
	var that = this;
	//start transaction
	var transaction = this.database.transaction([this.name], 'readwrite');
	transaction.addEventListener('error', function(event) {
		console.error('Error with transaction while adding item ' + item[that.keypath], event);
	});
	transaction.addEventListener('abort', function(event) {
		console.error('Transaction aborted while adding item ' + item[that.keypath], event);
	});
	//retrieve store
	var store = transaction.objectStore(this.name);
	//do request
	var request = store.put(item);
	request.addEventListener('error', function(event) {
		console.error('Error with request while adding item ' + item[that.keypath], event);
	});
	request.addEventListener('success', function(event) {
		if(callback) {
			callback.call(undefined, event);
		}
	});
};

DBConnector.prototype.addAll = function(items, callback) {
	if(items.length === 0) {
		if(callback) {
			callback.call();
		}
	}
	else {
		var that = this;
		this.add(items[0], function() {
			that.addAll(items.slice(1), callback);
		});
	}
};

DBConnector.prototype.get = function(item_id, callback) {
	var that = this;
	//start transaction
	var transaction = this.database.transaction([this.name]);
	transaction.addEventListener('error', function(event) {
		console.error('Error with transaction while retrieving item ' + item_id, event);
	});
	transaction.addEventListener('abort', function(event) {
		console.error('Transaction aborted while retrieving item ' + item_id, event);
	});
	//retrieve store
	var store = transaction.objectStore(this.name);
	//do request
	var request = store.get(item_id);
	request.addEventListener('error', function(event) {
		console.error('Error with request while retrieving item ' + item_id, event);
	});
	request.addEventListener('success', function(event) {
		if(callback) {
			callback.call(undefined, event.target.result);
		}
	});
};

DBConnector.prototype.getAll = function(result_callback, callback) {
	var that = this;
	//start transaction
	var transaction = this.database.transaction([this.name]);
	transaction.addEventListener('error', function(event) {
		console.error('Error with transaction while retrieving items', event);
	});
	transaction.addEventListener('abort', function(event) {
		console.error('Transaction aborted while retrieving items', event);
	});
	//retrieve store
	var store = transaction.objectStore(this.name);
	//do request using cursor
	var results = [];
	var key_range = IDBKeyRange.lowerBound(0);
	var cursor = store.openCursor(key_range);
	cursor.addEventListener('error', function(event) {
		console.error('Error with request while retrieving items', event);
	});
	cursor.addEventListener('success', function(event) {
		var result = event.target.result;
		if(result) {
			results.push(result.value);
			if(result_callback) {
				result_callback.call(undefined, result.value);
			}
			result.continue();
		}
		//no more entry
		else {
			if(callback) {
				callback.call(undefined, results);
			}
		}
	});
};

DBConnector.prototype.getSome = function(filter, callback) {
	this.getAll(
		undefined,
		function(results) {
			//apply filter on results if needed
			var items = filter ? results.filter(filter) : results;
			callback.call(undefined, items);
		}
	);
};


DBConnector.prototype.remove = function(item_id, callback) {
	var that = this;
	//start transaction
	var transaction = this.database.transaction([this.name], 'readwrite');
	transaction.addEventListener('error', function(event) {
		console.error('Error with transaction while removing item ' + item_id, event);
	});
	transaction.addEventListener('abort', function(event) {
		console.error('Transaction aborted while removing item ' + item_id, event);
	});
	//retrieve store
	var store = transaction.objectStore(this.name);
	//do request
	var request = store.delete(item_id);
	request.addEventListener('error', function(event) {
		console.error('Error with request while removing item ' + item_id, event);
	});
	request.addEventListener('success', function(event) {
		if(callback) {
			callback.call(undefined, event.target.result);
		}
	});
};

DBConnector.prototype.removeAll = function(callback) {
	this.removeSome(undefined, callback);
};

DBConnector.prototype.removeSome = function(filter, callback) {
	var deleted_items_number = 0;
	var that = this;
	this.getSome(filter, function(items) {
		//delete filtered items
		var i = 0, length = items.length, item;
		if(length > 0) {
			for(; i < length; i++) {
				item = items[i];
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
};
