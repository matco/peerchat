'use strict';

const notification_close_time = 5000;
//remember if notification permission has been requested to avoid asking to the user more than once
let notification_permission_requested = false;

let error_close_timeout;

export const UI = {
	Notify : function(message, options) {
		//ask for permission if user has not explicitly denied nor granted notification (permission can be default or undefined)
		if(window.Notification && !['granted', 'denied'].includes(Notification.permission) && !notification_permission_requested) {
			notification_permission_requested = true;
			Notification.requestPermission(function() {
				//re-notify
				UI.Notify(message, options);
			});
		}
		//use native notification
		else {
			const notification = new Notification(message, options);
			notification.addEventListener('show', function() {
				setTimeout(function() {
					notification.close();
				}, notification_close_time);
			});
		}
	},
	ShowError : function(error, error_close_time) {
		//clear previous if any
		if(error_close_timeout) {
			clearTimeout(error_close_timeout);
		}
		//display error
		const error_container = document.getElementById('error');
		error_container.textContent = error;
		//clear automatically error after a time if asked
		if(error_close_time) {
			error_close_timeout = setTimeout(function() {
				error_container.textContent = '';
			}, error_close_time);
		}
	}
};
