'use strict';

function create_data_transfer() {
	let data = {};
	return {
		getData: function(key) {
			return data[key];
		},
		setData: function(key, value) {
			data[key] = value;
			this.types.push(key);
		},
		clearData: function() {
			data = {};
			this.types = [];
		},
		types: [],
		setDragImage: function() {
			//parameters should be image, x and y
			//not implemented
		},
		effectAllowed: undefined,
		dropEffect: undefined
	};
}

function trigger_change(element) {
	const change = new UIEvent('change', {bubbles : true, cancelable : true});
	element.dispatchEvent(change);
}

function trigger_input(element) {
	const input = new InputEvent('input', {bubbles : true, cancelable : true});
	element.dispatchEvent(input);
}

function trigger_keydown(element, key) {
	const keydown = new KeyboardEvent('keydown', {key : key, bubbles : true, cancelable : true});
	element.dispatchEvent(keydown);
}

export class Tester {
	constructor(win, doc) {
		this.window = win || window;
		this.document = doc || document;
		this.scripts = [];
	}
	get(selector) {
		//exclude empty selector
		if(!selector) {
			const message = 'A valid selector or a HTMLElement must provided';
			this.window.console.log(message);
			this.window.console.trace();
			throw new this.window.Error(message);
		}
		if(String.isString(selector)) {
			//try to find element
			const element = this.document.querySelector(selector);
			if(!element) {
				const message = 'No element match selector ' + selector;
				this.window.console.log(message);
				this.window.console.trace();
				throw new this.window.Error(message);
			}
			return element;
		}
		return selector;
	}
	get_by_text(selector, text) {
		const element = this.get(selector);
		const children = element.children;
		return children.find(c => c.textContent === text) || children.find(c => this.get_by_text(c, text));
	}
	click(selector) {
		const element = this.get(selector);
		//trigger focus event in any case
		const focus = new FocusEvent('focus');
		element.dispatchEvent(focus);
		//for link, update browser location
		if(element.nodeName.toLowerCase() === 'a' && element.hasAttribute('href') && element.getAttribute('href') !== '#') {
			this.window.location = element.getAttribute('href');
			//var hashchange = new HashChangeEvent('hashchange');
			//this.window.dispatchEvent(hashchange);
		}
		//for other elements, trigger a click event
		else {
			const click = new MouseEvent('click', {view : this.window, bubbles : true, cancelable : true, detail : 1});
			element.dispatchEvent(click);
		}
	}
	double_click(selector) {
		const element = this.get(selector);
		const dblclick = new MouseEvent('dblclick', {view : this.window, bubbles : true, cancelable : true, detail : 1});
		element.dispatchEvent(dblclick);
	}
	right_click(selector) {
		const element = this.get(selector);
		const contextmenu = new MouseEvent('contextmenu', {view : this.window, bubbles : true, cancelable : true, detail : 1});
		element.dispatchEvent(contextmenu);
	}
	drag_and_drop(draggable_selector, droppable_selector) {
		const draggable = this.get(draggable_selector);
		const droppable = this.get(droppable_selector);
		const data_transfer = create_data_transfer();

		const dragstart = new MouseEvent('DragEvent');
		dragstart.initEvent('dragstart', true, true);
		dragstart.dataTransfer = data_transfer;
		draggable.dispatchEvent(dragstart);

		const dragenter = new MouseEvent('DragEvent');
		dragenter.initEvent('dragenter', true, true);
		dragenter.dataTransfer = data_transfer;
		droppable.dispatchEvent(dragenter);

		const drop = new MouseEvent('DragEvent');
		drop.initEvent('drop', true, true);
		drop.dataTransfer = data_transfer;
		droppable.dispatchEvent(drop);

		const dragend = new MouseEvent('DragEvent');
		dragend.initEvent('dragend', true, true);
		dragend.dataTransfer = data_transfer;
		draggable.dispatchEvent(dragend);

		//TODO use following code as soon as possible
		/*var dragstart_event = new DragEvent('dragstart');
		console.log(dragstart_event.dataTransfer);
		draggable.dispatchEvent(dragstart_event);

		var dragenter_event = new DragEvent('dragenter');
		droppable.dispatchEvent(dragenter_event);

		var drop_event = new DragEvent('drop');
		droppable.dispatchEvent(drop_event);

		var dragend_event = new DragEvent('dragend');
		draggable.dispatchEvent(dragend_event);*/
	}
	//forms
	type(selector, value) {
		const element = this.get(selector);
		element.value = value;
		//trigger change event manually because it is not fired by the browser when the value is set with js
		trigger_change(element);
		trigger_input(element);
	}
	check(selector) {
		const element = this.get(selector);
		element.checked = true;
		trigger_change(element);
	}
	uncheck(selector) {
		const element = this.get(selector);
		element.checked = false;
		trigger_change(element);
	}
	submit(selector) {
		const element = this.get(selector);
		const submit = this.document.createEvent('Event');
		submit.initEvent('submit', true, true);
		element.dispatchEvent(submit);
		//submit event could throw an exception if form is not valid
	}
	//sequence must be a key like explained here https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
	//that means you can send letters or digits directly such as "0", "4", "a" or "h" but not "Number0", "Number4", "KeyQ" or "KeyH"
	//you can also send other keys such as "Escape", "F2", "PageDown"
	//a valid sequence is ['a', 'Escape', 'q', '5', 'PageDown']
	//this code does not manage modifier keys (such as "Ctrl", "Alt" or "Shift") and only set the key property of the event (and not the code property)
	//TODO send all other events: "keyup", "keypress".
	press(sequence, selector) {
		//keys are usually sent on the whole document element
		const element = selector ? this.get(selector) : this.document;
		sequence.forEach(k => trigger_keydown(element, k));
	}
	wait(callback, time) {
		const timeout = time || 100;
		this.window.setTimeout(callback, timeout);
	}
	delay(script) {
		this.scripts.push(script);
	}
	advance() {
		if(!this.scripts.isEmpty()) {
			const script = this.scripts.shift();
			script.call(this);
		}
	}
	globalize(object) {
		const hook = object || window;
		const methods = ['get', 'get_by_text', 'click', 'double_click', 'right_click', 'drag_and_drop', 'type', 'check', 'uncheck', 'submit', 'press', 'wait'];
		methods.forEach(method => hook[method] = this[method].bind(this));
	}
}
