'use strict';

var UI = {};

(function() {
	var notification_close_time = 5000;

	//remember if notification permission has been requested to avoid asking to the user more than once
	var notification_permission_requested = false;

	UI.Notify = function(message, options) {
		//ask for permission if user has not explicitly denied nor granted notification (permission can be default or undefined)
		if(window.Notification && !['granted', 'denied'].includes(Notification.permission) && !notification_permission_requested) {
			notification_permission_requested = true;
			Notification.requestPermission(function(status) {
				//re-notify
				UI.Notify(message, options);
			});
		}
		//use native notification
		else {
			var notification = new Notification(message, options);
			notification.addEventListener('show', function() {
				setTimeout(function() {
					notification.close();
				}, notification_close_time);
			});
		}
	};
})();

(function() {
	var modals = [];

	//close modal with click outside modal
	function click_close_modal(event) {
		var modal = modals.last();
		if(!modal.locked && !modal.contains(event.target)) {
			UI.CloseModal(modal);
		}
	}

	//close modal windows with escape key
	function escape_close_modal(event) {
		var modal = modals.last();
		if(!modal.locked && event.keyCode === 27) {
			UI.CloseModal(modal);
		}
	}

	UI.OpenModal = function(element, locked) {
		//store locking status
		element.locked = locked || false;

		//add new modal to list
		modals.push(element);

		var overlay = document.getElementById('modal_overlay');

		//show overlay if this is first modal open
		if(modals.length === 1) {
			overlay.style.display = 'block';
		}

		//put modal window just over overlay
		var index = parseInt(overlay.style.zIndex) || 100;
		overlay.style.zIndex = index + 2;
		element.style.zIndex = index + 3;
		element.style.display = 'block';

		//add document listeners for first modal
		if(modals.length === 1) {
			document.addEventListener('click', click_close_modal);
			document.addEventListener('keydown', escape_close_modal);
		}
	};

	UI.CloseModal = function(element) {
		//retrieve modal
		var modal = element || modals.last();
		if(modal) {
			//hide modal window
			modal.style.display = 'none';

			var overlay = document.getElementById('modal_overlay');

			//remove document listener for last modal
			if(modals.length === 1) {
				document.removeEventListener('click', click_close_modal);
				document.removeEventListener('keydown', escape_close_modal);
			}

			//put overlay just under modal window
			var index = parseInt(overlay.style.zIndex);
			overlay.style.zIndex = index - 2;

			if(modals.length === 1) {
				//remove overlay if this is last open modal
				overlay.style.display = 'none';
			}

			//remove modal from list
			modals.removeElement(modal);
		}
	};

	UI.CloseModals = function() {
		modals.slice().forEach(UI.CloseModal);
	};

	UI.IsModalOpen = function() {
		return !modals.isEmpty();
	};
})();
