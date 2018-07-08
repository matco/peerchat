'use strict';

function CSV(data) {
	this.data = data;
}

CSV.DECIMAL_SEPARATOR = 1.1.toLocaleString().substring(1, 2);
CSV.MIME_TYPE = 'text/csv;charset=utf-8';

CSV.prototype.toString = function() {
	var regexp = /"/g;
	return this.data.map(function(line) {
		return line.map(function(cell) {
			return '"' + cell.replace(regexp, '""') + '"';
		}).join(',');
	}).join('\n');
};

CSV.prototype.toBlob = function() {
	return new Blob([this.toString()], {type : CSV.MIME_TYPE});
};

CSV.prototype.download = function(name) {
	var filename = name || new Date().toFullDisplay();

	var blob = this.toBlob();
	var file = new File([blob], filename, {type : CSV.MIME_TYPE, lastModified : Date.now()});
	var url = window.URL.createObjectURL(file);

	//Chrome does not support to set location href
	if(/Chrome/.test(navigator.userAgent)) {
		var link = document.createFullElement('a', {href : url, download : filename});
		var event = document.createEvent('MouseEvents');
		event.initUIEvent('click', true, true, window, 1);
		link.dispatchEvent(event);
	}
	else {
		location.href = url;
	}

	//revoke url after event has been dispatched
	setTimeout(function() {
		window.URL.revokeObjectURL(url);
	}, 0);
};