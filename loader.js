'use strict';

export class Loader {
	constructor(doc, parameters) {
		//DOMDocument : document where scripts must be loaded
		this.document = doc || document;
		//String : base url for scripts
		this.url;
		//Boolean : add a timestamp after each script to avoid browser cache
		this.nocache = true;
		//bind parameters
		for(const parameter in parameters) {
			this[parameter] = parameters[parameter];
		}
	}
	loadJavascript(js, type) {
		//build javascript url
		let js_url = '';
		if(this.url) {
			js_url += this.url;
		}
		js_url += js;
		//append timestamp at the end of the url to avoid cache if required
		if(this.nocache) {
			js_url += '?' + new Date().getTime();
		}
		const that = this;
		return new Promise(function(resolve, reject) {
			//check javascript has not already been included
			if(!that.document.head.querySelector('script[type="' + type + '"][src^="' + js_url + '"]')) {
				//create script element
				const script = that.document.createElement('script');
				script.setAttribute('type', type);
				script.setAttribute('src', js_url);
				script.addEventListener('load', resolve);
				script.addEventListener('error', reject);
				that.document.head.appendChild(script);
			}
			else {
				resolve();
			}
		});
	}
	loadLibrary(library) {
		return this.loadJavascript(library, 'text/javascript');
	}
	loadModule(mod) {
		return this.loadJavascript(mod, 'module');
	}
	loadCSS(css) {
		//build css url
		let css_url = '';
		if(this.url) {
			css_url += this.url;
		}
		css_url += css;
		if(this.nocache) {
			css_url += '?' + new Date().getTime();
		}
		const that = this;
		return new Promise(function(resolve, reject) {
			//check library has not already been included
			if(!that.document.head.querySelector('link[type="text/css"][href^="' + css_url + '"]')) {
				//create link element
				const link = that.document.createElement('link');
				link.setAttribute('type', 'text/css');
				link.setAttribute('rel', 'stylesheet');
				link.setAttribute('href', css_url);
				link.addEventListener('load', resolve);
				link.addEventListener('error', reject);
				that.document.head.appendChild(link);
			}
			else {
				resolve();
			}
		});
	}
	loadHTML(html, container) {
		//build html url
		let html_url = '';
		if(this.url) {
			html_url += this.url;
		}
		html_url += html;
		if(this.nocache) {
			html_url += '?' + new Date().getTime();
		}
		const that = this;
		return new Promise(function(resolve, reject) {
			const xhr = new XMLHttpRequest();
			xhr.addEventListener(
				'load',
				function(event) {
					if(event.target.status === 200) {
						const node = that.document.importNode(event.target.response.body.firstElementChild, true);
						container.appendChild(node);
						resolve();
					}
					else {
						reject();
					}
				}
			);
			xhr.responseType = 'document';
			xhr.open('GET', html_url, true);
			xhr.send();
		});
	}
	loadQueuedJavascript(libraries, type) {
		return libraries.reduce((a, l) => {return a.then(this.loadJavascript.bind(this, l, type));}, Promise.resolve());
	}
	loadQueuedLibraries(libraries) {
		return libraries.reduce((a, l) => {return a.then(this.loadLibrary.bind(this, l));}, Promise.resolve());
	}
	loadQueuedModules(libraries) {
		return libraries.reduce((a, l) => {return a.then(this.loadModule.bind(this, l));}, Promise.resolve());
	}
	loadConcurrentLibraries(libraries) {
		return Promise.all(libraries.map(l => this.load(l)));
	}
	load(libraries, concurrent) {
		//array of libraries
		if(Array.isArray(libraries)) {
			if(concurrent) {
				return this.loadConcurrentLibraries(libraries);
			}
			return this.loadQueuedLibraries(libraries);
		}
		//one library
		return this.loadLibrary(libraries);
	}
}
