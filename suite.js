'use strict';

function Suite(name, path, bundles) {
	this.name = name;
	this.path = path;
	this.bundles = bundles;

	this.began = false;
	this.times = {};
	this.counters = {
		successes : 0,
		fails : 0
	};
}

Suite.fromJSON = function(s) {
	//create suite
	var suite = new Suite(s.name, s.path);
	//create bundles
	suite.bundles = s.bundles.map(function(b) {
		return new Bundle(suite, b.dom, b.website, b.dependencies, b.test);
	});
	return suite;
};

Suite.prototype.getTests = function() {
	return this.counters.successes + this.counters.fails;
};

Suite.prototype.getDuration = function() {
	//suite may still be running
	var stop = this.times.stop || new Date();
	return stop.getTime() - this.times.start.getTime();
};

Suite.generateReport = function(name, suites, stylesheet_url) {
	//generate report from bundle asserts
	var report = document.implementation.createDocument(null, 'testsuites', null);

	//add style sheet
	if(stylesheet_url) {
		report.styleSheetsSets = [{type : 'text/xsl', href : stylesheet_url}];
		var pi = report.createProcessingInstruction('xml-stylesheet', 'type="text/xsl" href="' + stylesheet_url + '"');
		report.insertBefore(pi, report.documentElement);
	}

	//add information
	report.documentElement.setAttribute('name', name);
	report.documentElement.setAttribute('failures', suites.map(s => s.counters.fails).reduce((previous, currrent) => previous + currrent));
	report.documentElement.setAttribute('tests', suites.map(s => s.getTests()).reduce((previous, currrent) => previous + currrent));
	report.documentElement.setAttribute('time', suites.map(s => s.getDuration()).reduce((previous, currrent) => previous + currrent) / 1000);

	suites.map(s => s.contributeToReport(report));

	return report;
};

Suite.prototype.contributeToReport = function(report) {
	var test_suite = report.createFullElement('testsuite', {
		name : this.name,
		hostname : window.navigator.userAgent,
		failures : this.counters.fails,
		tests : this.getTests(),
		time : this.getDuration() / 1000,
		timestamp : this.times.start.toISOString()
	});
	report.documentElement.appendChild(test_suite);

	//add properties
	var properties = report.createElement('properties');
	test_suite.appendChild(properties);
	properties.appendChild(report.createFullElement('property', {name : 'platform', value : window.navigator.platform}));
	properties.appendChild(report.createFullElement('property', {name : 'os.name', value : window.navigator.oscpu}));

	//add test cases
	Array.prototype.concat.apply([], this.bundles.map(b => b.assert.results)).map(function(result) {
		var test_case = report.createFullElement('testcase', {name : result.message || '', specification : result.specification || ''});
		if(!result.success) {
			test_case.appendChild(report.createFullElement('failure', {message : result.message}));
		}
		return test_case;
	}).forEach(Node.prototype.appendChild, test_suite);
};

Suite.prototype.run = function(doc) {
	this.times.start = new Date();
	var that = this;
	return that.bundles.reduce((a, b) => {return a.then(Bundle.prototype.run.bind(b, doc))}, Promise.resolve()).then(function() {
		that.times.stop = new Date();
		return that;
	});
};
