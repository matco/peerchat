'use strict';

var UI = {};

UI.Info = function(message, locked) {
	document.getElementById('info_message').textContent = message;
	UI.OpenModal(document.getElementById('info'), locked);
};

UI.StartLoading = function() {
	document.body.classList.add('loading');
	document.getElementById('loading').style.display = 'block';
};

UI.StopLoading = function() {
	document.body.classList.remove('loading');
	document.getElementById('loading').style.display = 'none';
};

(function() {
	var notification_close_time = 5000;
	var notification_interval;
	var notification_timeout;

	UI.Notify = function(message, options) {
		//ask for permission if user has not explicity denied nor granted notification (permission can be default or undefined)
		if(Notification.permission !== 'granted' && Notification.permission !== 'denied') {
			Notification.requestPermission(function(status) {
				Notification.permission = status;
				//re-notify
				UI.Notify(message, options);
			});
		}
		//use native notification
		else if(Notification.permission === 'granted') {
			var notification = new Notification(message, options);
			notification.addEventListener('show', function() {
				setTimeout(function() {
					notification.close();
				}, notification_close_time);
			});
		}
		//fallback on html notification
		else {
			var notification = document.getElementById('notification');
			//stop current animation if required
			if(notification_interval) {
				clearInterval(notification_interval);
			}
			if(notification_timeout) {
				clearTimeout(notification_timeout);
			}
			//update notification
			notification.textContent = message;
			notification.style.opacity = 1;
			notification.style.display = 'block';
			//start animation
			notification_timeout = setTimeout(function() {
				notification_interval = setInterval(function() {
					if(notification.style.opacity <= 0.01) {
						notification.style.display = 'none';
						clearInterval(notification_interval);
					}
					else {
						notification.style.opacity -= 0.01;
					}
				}, 10);
			}, notification_close_time);
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

	//close modal windows with echap
	function escape_close_modal(event) {
		var modal = modals.last();
		if(!modal.locked && event.keyCode === 27) {
			UI.CloseModal(modal);
		}
	}

	UI.OpenModal = function(element, locked) {
		//store locking status
		element.locked = locked || false;

		//show overlay or hide previous modal
		if(modals.isEmpty()) {
			document.getElementById('modal_overlay').style.display = 'block';
		}
		else {
			modals.last().style.zIndex = 99;
		}
		element.style.display = 'block';
		//add new modal to list
		modals.push(element);
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
			//remove modal from list
			modals.removeElement(modal);
			modal.style.display = 'none';
			//remove overlay or show previous modal
			if(modals.isEmpty()) {
				document.getElementById('modal_overlay').style.display = 'none';
				//remove document listener for last modal
				document.removeEventListener('click', click_close_modal);
				document.removeEventListener('keydown', escape_close_modal);
			}
			else {
				modals.last().style.zIndex = 100;
			}
		}
	};

	UI.IsModalOpen = function() {
		return !modals.isEmpty();
	};
})();

(function() {
	//show tab associated content and hide other contents
	function select_tab() {
		if(!this.classList.contains('disabled')) {
			this.parentNode.children.forEach(function(tab) {
				if(tab === this) {
					tab.classList.add('selected');
					document.getElementById(tab.dataset.tab).style.display = 'block';
				}
				else {
					tab.classList.remove('selected');
					document.getElementById(tab.dataset.tab).style.display = 'none';
				}
			}, this);
		}
	}

	UI.Tabify = function(container) {
		container.children.forEach(function(tab) {
			document.getElementById(tab.dataset.tab).style.display = tab.classList.contains('selected') ? 'block' : 'none';
			tab.addEventListener('click', select_tab);
		});
	};
})();

UI.Validate = function(message, yes_callback, no_callback, context, yes_text, no_text) {
	var validate_window = document.getElementById('validate');
	document.getElementById('validate_message').textContent = message;
	//manage buttons
	var validate_buttons = document.getElementById('validate_buttons');
	validate_buttons.clear();
	var no_button = document.createFullElement(
		'button',
		{type : 'button'},
		no_text || 'No',
		{
			click : function(event) {
				Event.stop(event);
				if(no_callback) {
					no_callback.call(context || this);
				}
				UI.CloseModal(validate_window);
			}
		}
	);
	var yes_button = document.createFullElement(
		'button',
		{type : 'button', style : 'margin-left: 5px;', autofocus : true},
		yes_text || 'Yes',
		{
			click : function(event) {
				Event.stop(event);
				if(yes_callback) {
					yes_callback.call(context || this);
				}
				UI.CloseModal(validate_window);
			}
		}
	);
	validate_buttons.appendChild(no_button);
	validate_buttons.appendChild(yes_button);

	//yes_button.focus();
	UI.OpenModal(validate_window, true);
};

//delay task to let browser time to repaint
UI.Delay = function(callback) {
	setTimeout(callback, 50);
};