'use strict';

class CSV {
	constructor(data) {
		this.data = data;
	}
	toString() {
		const regexp = /"/g;
		return this.data.map(l => l.map(c => '"' + c.replace(regexp, '""') + '"').join(',')).join('\n');
	}
	toBlob() {
		return new Blob([this.toString()], {type: CSV.MIME_TYPE});
	}
	download(name) {
		const filename = name || new Date().toFullDisplay();
		const blob = this.toBlob();
		const file = new File([blob], filename, {type: CSV.MIME_TYPE, lastModified: Date.now()});
		const url = window.URL.createObjectURL(file);
		//Chrome does not support to set location href
		if(/Chrome/.test(navigator.userAgent)) {
			const link = document.createFullElement('a', {href: url, download: filename});
			const event = document.createEvent('MouseEvents');
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
	}
}

CSV.DECIMAL_SEPARATOR = 1.1.toLocaleString().substring(1, 2);
CSV.MIME_TYPE = 'text/csv;charset=utf-8';

export {CSV};
