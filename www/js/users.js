import './tools/extension.js';

import {UUID} from './tools/uuid.js';

let users = [];
let user;

export const Users = {
	Load: function() {
		//restore user or create one
		if(sessionStorage.getItem('user')) {
			user = sessionStorage.getObject('user');
		}
		else {
			user = {id: UUID.Generate(), name: ''};
		}
		users = [user];
	},
	Unload: function() {
		//save user
		sessionStorage.setObject('user', user);
	},
	Reset: function() {
		users = [user];
	},
	GetCurrentUser: function() {
		return user;
	},
	AddUsers: function(u) {
		users.pushAll(u);
	},
	AddUser: function(u) {
		users.push(u);
	},
	RemoveUser: function(u) {
		users.removeElement(u);
	},
	GetUser: function(user_id) {
		return users.find(u => u.id === user_id);
	}
};
