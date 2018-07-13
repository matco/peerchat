'use strict';

import {Bundle} from './bundle.js';

export class Suite {
	constructor(name, path, bundles) {
		this.name = name;
		this.path = path;
		this.bundles = bundles;

		this.began = false;
		this.times = {};
		this.counters = {
			successes: 0,
			fails: 0
		};
	}
	getTests() {
		return this.counters.successes + this.counters.fails;
	}
	getDuration() {
		//suite may still be running
		const stop = this.times.stop || new Date();
		return stop.getTime() - this.times.start.getTime();
	}
	contributeToReport(report) {
		const test_suite = report.createFullElement('testsuite', {
			name: this.name,
			hostname: window.navigator.userAgent,
			failures: this.counters.fails,
			tests: this.getTests(),
			duration: this.getDuration() / 1000,
			timestamp: this.times.start.toISOString()
		});
		report.documentElement.appendChild(test_suite);
		//add properties
		const properties = report.createElement('properties');
		test_suite.appendChild(properties);
		properties.appendChild(report.createFullElement('property', {name: 'platform', value: window.navigator.platform}));
		properties.appendChild(report.createFullElement('property', {name: 'os.name', value: window.navigator.oscpu}));
		//add test cases
		Array.prototype.concat.apply([], this.bundles.map(b => b.assert.results)).map(function(result) {
			const test_case = report.createFullElement('testcase', {name: result.message || '', specification: result.specification || ''});
			if(!result.success) {
				test_case.appendChild(report.createFullElement('failure', {message: result.message}));
			}
			return test_case;
		}).forEach(Node.prototype.appendChild, test_suite);
	}
	run(doc) {
		this.times.start = new Date();
		const that = this;
		return that.bundles.reduce((a, b) => {return a.then(Bundle.prototype.run.bind(b, doc));}, Promise.resolve()).then(function() {
			that.times.stop = new Date();
			return that;
		});
	}
	static fromJSON(s) {
		//create suite
		const suite = new Suite(s.name, s.path);
		//create bundles
		suite.bundles = s.bundles.map(function(b) {
			return new Bundle(suite, b.native, b.dom, b.website, b.dependencies, b.test);
		});
		return suite;
	}
	static generateReport(name, suites, stylesheet_url) {
		//generate report from bundle asserts
		const report = document.implementation.createDocument(null, 'testsuites', null);
		//add style sheet
		if(stylesheet_url) {
			report.styleSheetsSets = [{type: 'text/xsl', href: stylesheet_url}];
			const pi = report.createProcessingInstruction('xml-stylesheet', 'type="text/xsl" href="' + stylesheet_url + '"');
			report.insertBefore(pi, report.documentElement);
		}
		//add information
		report.documentElement.setAttribute('name', name);
		report.documentElement.setAttribute('failures', suites.map(s => s.counters.fails).reduce((previous, currrent) => previous + currrent));
		report.documentElement.setAttribute('tests', suites.map(s => s.getTests()).reduce((previous, currrent) => previous + currrent));
		report.documentElement.setAttribute('duration', suites.map(s => s.getDuration()).reduce((previous, currrent) => previous + currrent) / 1000);
		suites.map(s => s.contributeToReport(report));
		return report;
	}
}
