'use strict';

//DOM
//Node
Node.prototype.clear = function() {
	while(this.firstChild) {
		this.removeChild(this.firstChild);
	}
	//allow chain
	return this;
};
/*Node.prototype.up = function(tag) {
	if(this.parentNode.nodeName.toLowerCase() === tag.toLowerCase()) {
		return this.parentNode;
	}
	return this.parentNode.up(tag);
};*/

//NodeList
/*for(property in Array.prototype) {
	if(Array.prototype.hasOwnProperty(property) && typeof(Array.prototype[property]) === 'function') {
		console.log(property);
		NodeList.prototype[property] = Array.prototype[property];
	}
}*/
NodeList.prototype.indexOf = Array.prototype.indexOf;
NodeList.prototype.filter = Array.prototype.filter;
NodeList.prototype.forEach = Array.prototype.forEach;
NodeList.prototype.every = Array.prototype.every;
NodeList.prototype.map = Array.prototype.map;
NodeList.prototype.some = Array.prototype.some;
NodeList.prototype.sort = Array.prototype.sort;
NodeList.prototype.find = Array.prototype.find;

//Element
Element.prototype.setAttributes = function(attributes) {
	if(attributes) {
		for(var attribute in attributes) {
			if(attributes.hasOwnProperty(attribute)) {
				this.setAttribute(attribute, attributes[attribute]);
			}
		}
	}
	//allow chain
	return this;
};

//Document
(function() {
	function enhance_element(element, attributes, text, listeners) {
		element.setAttributes(attributes);
		if(text !== undefined) {
			element.appendChild(this.createTextNode(text));
		}
		if(listeners) {
			for(var listener in listeners) {
				if(listeners.hasOwnProperty(listener)) {
					element.addEventListener(listener, listeners[listener], false);
				}
			}
		}
		return element;
	}

	Document.prototype.createFullElement = function(tag, attributes, text, listeners) {
		return enhance_element.call(this, this.createElement(tag), attributes, text, listeners);
	};
	Document.prototype.createFullElementNS = function(ns, tag, attributes, text, listeners) {
		return enhance_element.call(this, this.createElementNS(ns, tag), attributes, text, listeners);
	};
})();

//HTML
//HTMLElement
HTMLElement.prototype.getPosition = function() {
	var position = {left : this.offsetLeft, top : this.offsetTop};
	if(this.offsetParent) {
		var parent_position = this.offsetParent.getPosition();
		return {left : parent_position.left + position.left, top : parent_position.top + position.top};
	}
	return position;
};

//HTMLSelectElement
HTMLSelectElement.prototype.fill = function(entries, blank_option, selected_entries) {
	//transform entries if an array has been provided
	var options;
	if(Array.isArray(entries)) {
		options = {};
		var i = 0, length = entries.length;
		for(; i < length; i++) {
			options[entries[i]] = entries[i];
		}
	}
	else {
		options = entries;
	}
	//transform selected entries
	var selected_options = selected_entries ? Array.isArray(selected_entries) ? selected_entries : [selected_entries] : undefined;
	//clear and fill select
	this.clear();
	//add blank options
	if(blank_option) {
		this.appendChild(document.createElement('option'));
	}
	//add other options
	var properties;
	for(var option in options) {
		if(options.hasOwnProperty(option)) {
			properties = {value : option};
			if(selected_options && selected_options.contains(properties.value)) {
				properties.selected = 'selected';
			}
			this.appendChild(document.createFullElement('option', properties, options[option]));
		}
	}
	//allow chain
	return this;
};
HTMLSelectElement.prototype.fillObjects = function(objects, value_property, label_property, blank_option, selected_entries) {
	var entries = {};
	var i = 0, length = objects.length;
	for(; i < length; i++) {
		var object = objects[i];
		var value = Function.isFunction(value_property) ? value_property.call(object) : object[value_property];
		var label = Function.isFunction(label_property) ? label_property.call(object) : object[label_property];
		entries[value] = label;
	}
	return this.fill(entries, blank_option, selected_entries);
};

//HTMLCollection
HTMLCollection.prototype.indexOf = Array.prototype.indexOf;
HTMLCollection.prototype.filter = Array.prototype.filter;
HTMLCollection.prototype.forEach = Array.prototype.forEach;
HTMLCollection.prototype.every = Array.prototype.every;
HTMLCollection.prototype.map = Array.prototype.map;
HTMLCollection.prototype.some = Array.prototype.some;
HTMLCollection.prototype.find = Array.prototype.find;

//Storage
Storage.prototype.setObject = function(key, value) {
	this.setItem(key, JSON.stringify(value));
};
Storage.prototype.getObject = function(key) {
	var item = this.getItem(key);
	return item ? JSON.parse(item) : null;
};

//Event
Event.stop = function(event) {
	if(event) {
		event.stopPropagation();
		event.preventDefault();
	}
};

