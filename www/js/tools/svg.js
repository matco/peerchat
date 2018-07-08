'use strict';

var SVG = (function() {

	function append_xhtml_properties(object, properties) {
		if(object && properties) {
			for(var property in properties) {
				object.setAttribute(property, properties[property]);
			}
		}
		return object;
	}

	function append_properties(object, properties) {
		if(object && properties) {
			for(var property in properties) {
				object.setAttributeNS(null, property, properties[property]);
			}
		}
		return object;
	}

	function round_coordinate(coordinate) {
		return Math.round(coordinate - 0.5) + 0.5;
		//return coordinate;
	}

	function round_dimension(dimension) {
		return Math.round(dimension);
		//return dimension;
	}

	return {
		create : function(width, height, properties) {
			var svg = document.createElementNS(SVG.Namespaces.SVG, 'svg');
			append_xhtml_properties(svg, {
				version : '1.2',
				xmlns : SVG.Namespaces.SVG,
				'xmlns:xhtml' : SVG.Namespaces.XHTML,
				'xmlns:xlink' : SVG.Namespaces.XLINK,
				width : width + 'px',
				height : height + 'px'
			});
			return append_xhtml_properties(svg, properties);
		},
		element : function(tag, properties) {
			return append_properties(document.createElementNS(SVG.Namespaces.SVG, tag), properties);
		},
		rectangle : function(x, y, width, height, properties) {
			return append_properties(SVG.element('rect', {
					x : round_coordinate(x),
					y : round_coordinate(y),
					width : round_dimension(width),
					height : round_dimension(height)
				}), properties);
		},
		circle : function(cx, cy, r, properties) {
			return append_properties(SVG.element('circle', {
				cx : round_coordinate(cx),
				cy : round_coordinate(cy),
				r : round_dimension(r)
			}), properties);
		},
		line : function(x1, y1, x2, y2, properties) {
			return append_properties(SVG.element('line', {
				x1 : round_coordinate(x1),
				y1 : round_coordinate(y1),
				x2 : round_coordinate(x2),
				y2 : round_coordinate(y2)
			}), properties);
		},
		polyline : function(points, properties) {
			return append_properties(SVG.element('polyline', {
				points : points.map(round_coordinate).join(' '),
			}), properties);
		},
		text : function(x, y, content, properties) {
			var text = append_properties(SVG.element('text', {
				x : round_coordinate(x),
				y : round_coordinate(y)
			}), properties);
			text.appendChild(document.createTextNode(content));
			return text;
		},
		title : function(content, properties) {
			var title = SVG.element('title', properties);
			title.appendChild(document.createTextNode(content));
			return title;
		},
		link : function(url, properties) {
			var link = SVG.element('a');
			link.setAttributeNS(SVG.Namespaces.XLINK, 'xlink:href', url);
			return append_properties(link, properties);
		},
		path : function(x, y, path, properties) {
			return append_properties(SVG.element('path', {'d' : 'M' + round_coordinate(x) + ' ' + round_coordinate(y) + ' ' + path}), properties);
		},
		//work only with left to right and top to bottom languages
		textwrap : function(text, width) {
			//retrieve all words and clear text
			var words = text.textContent.split(' ');
			text.textContent = '';
			//create first line
			var tspan = append_properties(SVG.element('tspan', {x : text.getAttribute('x'), dy : 0}));
			text.appendChild(tspan);
			//re-add word one after an other
			var word;
			var line = [];
			while(word = words.shift()) {
				line.push(word);
				tspan.textContent = line.join(' ');
				//check if text is too long
				//a single word line must necessary fit in one line
				//otherwise, that means that a single word alone can not fit in specified width and will create a infinite loop
				if(line.length > 1 && tspan.getComputedTextLength() > width) {
					//remove last word and close line
					line.pop();
					tspan.textContent = line.join(' ');
					//start a new line
					tspan = append_properties(SVG.element('tspan', {x : text.getAttribute('x'), dy : 15}));
					text.appendChild(tspan);
					line = [];
					//excluded word must be managed next loop
					words.unshift(word);
				}
			}
		},
		center : function(element, x1, x2, y1, y2) {
			var box = element.getBBox();
			element.setAttribute('x', round_coordinate(x1 + (x2 - x1) / 2 - box.width / 2));
			element.setAttribute('y', round_coordinate(y1 + (y2 - y1) / 2 + box.height / 2));
		}
	};
})();

SVG.Namespaces = {
	SVG : 'http://www.w3.org/2000/svg',
	XHTML : 'http://www.w3.org/1999/xhtml',
	XLINK : 'http://www.w3.org/1999/xlink'
};