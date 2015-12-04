'use strict';

var LZW = {
	INITIAL_DICT_SIZE : 256,
	MAX_DICT_SIZE : 65536,

	Compress : function(string, dictionnary_max_size) {
		var i, length;
		//build dictionary
		var dictionary = {};
		for(i = 0; i < LZW.INITIAL_DICT_SIZE; i++) {
			dictionary[String.fromCharCode(i)] = i;
		}

		var current_code = LZW.INITIAL_DICT_SIZE;
		var out = [];

		var character;
		var phrase = '', new_phrase;
		//build output array
		for(i = 0, length = string.length; i < length; i++) {
			character = string.charAt(i);
			new_phrase = phrase + character;

			//there is a match in dictionary
			if(dictionary.hasOwnProperty(new_phrase)) {
				phrase = new_phrase;
			}
			else {
				out.push(dictionary[phrase]);
				//add new sequence to the dictionary
				if(!dictionnary_max_size || current_code < LZW.MAX_DICT_SIZE) {
					dictionary[new_phrase] = current_code;
					current_code++;
				}
				phrase = String(character);
			}
		}
		if(phrase.length > 0) {
			out.push(dictionary[phrase]);
		}
		return out;
	},

	/*Compress : function(string, dictionnary_max_size) {
		var dictionary = {};
		var out = [];
		var current_code = LZW.INITIAL_DICT_SIZE;
		var data = (string + '').split('');
		var phrase = data[0];
		var i, length;
		var character;
		//build output array
		for(i = 1, length = data.length; i < length; i++) {
			character = data[i];
			//there is a match in dictionary
			if(dictionary.hasOwnProperty(phrase + character)) {
				phrase += character;
			}
			else {
				out.push(phrase.length > 1 ? dictionary[phrase] : phrase.charCodeAt(0));
				if(!dictionnary_max_size || current_code < LZW.MAX_DICT_SIZE) {
					dictionary[phrase + character] = current_code;
					current_code++;
				}
				phrase = character;
			}
		}
		out.push(phrase.length > 1 ? dictionary[phrase] : phrase.charCodeAt(0));
		return out;
	},*/

	CompressToString : function(string) {
		return LZW.Compress(string, LZW.MAX_DICT_SIZE).map(function(charcode) {return String.fromCharCode(charcode);}).join('');
	},

	Decompress : function(integers, dictionnary_max_size) {
		var dictionary = {};
		var character = String.fromCharCode(integers[0]);
		var phrase;
		var previous_phrase = character;
		var out = [character];
		var current_code = LZW.INITIAL_DICT_SIZE;
		var i, length;
		for(i = 1, length = integers.length; i < length; i++) {
			var code = integers[i];
			if(code < LZW.INITIAL_DICT_SIZE) {
				phrase = String.fromCharCode(integers[i]);
			}
			else {
				phrase = dictionary[code] || (previous_phrase + character);
			}
			out.push(phrase);
			character = phrase.charAt(0);
			if(!dictionnary_max_size || current_code < dictionnary_max_size) {
				dictionary[current_code] = previous_phrase + character;
				current_code++;
			}
			previous_phrase = phrase;
		}
		return out.join('');
	},

	DecompressString : function(string) {
		var integers = string.split('').map(function(character) {return character.charCodeAt(0);})
		return LZW.Decompress(integers, LZW.MAX_DICT_SIZE);
	}
};
