steal("can/view", function(){
	
	
	function makeMap(str){
		var obj = {}, items = str.split(",");
		for ( var i = 0; i < items.length; i++ )
			obj[ items[i] ] = true;
		return obj;
	};
	
	var alphaNumericHU = "-A-Za-z0-9_",
		attributeNames = "[a-zA-Z_:]["+alphaNumericHU+":.]+",
		spaceEQspace = "\\s*=\\s*",
		dblQuote2dblQuote = "\"((?:\\\\.|[^\"])*)\"",
		quote2quote = "'((?:\\\\.|[^'])*)'",
		attributeEqAndValue = "(?:"+spaceEQspace+"(?:"+
		  "(?:\"[^\"]*\")|(?:'[^']*')|[^>\\s]+))?",
		stash = "\\{\\{([^\}]*)\\}\\}";
	
	var startTag = new RegExp("^<(["+alphaNumericHU+"]+)"+
	           "(" +
	               "(?:\\s+"+
	                   "(?:(?:"+attributeNames+attributeEqAndValue+")|"+
	                   "(?:"+stash+")+)"+
	                ")*"+
	            ")\\s*(\\/?)>"),
		endTag = new RegExp("^<\\/(["+alphaNumericHU+"]+)[^>]*>"),
		attr = new RegExp("(?:("+attributeNames+")"+
								"(?:"+spaceEQspace+
									"(?:"+
										"(?:"+dblQuote2dblQuote+")|(?:"+quote2quote+")|([^>\\s]+)"+
									")"+
								")?)|(?:"+stash+")","g"),
		mustache = new RegExp(stash,"g"),
		txtBreak = /<|\{\{/;

window.attr = attr;

	// Empty Elements - HTML 5
	var empty = makeMap("area,base,basefont,br,col,frame,hr,img,input,isindex,link,meta,param,embed");

	// Block Elements - HTML 5
	var block = makeMap("address,article,applet,aside,audio,blockquote,button,canvas,center,dd,del,dir,div,dl,dt,fieldset,figcaption,figure,footer,form,frameset,h1,h2,h3,h4,h5,h6,header,hgroup,hr,iframe,ins,isindex,li,map,menu,noframes,noscript,object,ol,output,p,pre,section,script,table,tbody,td,tfoot,th,thead,tr,ul,video");

	// Inline Elements - HTML 5
	var inline = makeMap("a,abbr,acronym,applet,b,basefont,bdo,big,br,button,cite,code,del,dfn,em,font,i,iframe,img,input,ins,kbd,label,map,object,q,s,samp,script,select,small,span,strike,strong,sub,sup,textarea,tt,u,var");

	// Elements that you can, intentionally, leave open
	// (and which close themselves)
	var closeSelf = makeMap("colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr");

	// Attributes that have their values filled in disabled="disabled"
	var fillAttrs = makeMap("checked,compact,declare,defer,disabled,ismap,multiple,nohref,noresize,noshade,nowrap,readonly,selected");

	// Special Elements (can contain anything)
	var special = makeMap("script,style");

	var HTMLParser = function (html, handler) {
		var index, chars, match, stack = [], last = html, stash;
		stack.last = function () {
			return this[this.length - 1];
		};

		while (html) {
			chars = true;

			// Make sure we're not in a script or style element
			if (!stack.last() || !special[stack.last()]) {

				// Comment
				if (html.indexOf("<!--") == 0) {
					index = html.indexOf("-->");

					if (index >= 0) {
						if (handler.comment)
							handler.comment(html.substring(4, index));
						html = html.substring(index + 3);
						chars = false;
					}

					// end tag
				} else if (html.indexOf("</") == 0) {
					match = html.match(endTag);

					if (match) {
						html = html.substring(match[0].length);
						match[0].replace(endTag, parseEndTag);
						chars = false;
					}

					// start tag
				} else if (html.indexOf("<") == 0) {
					match = html.match(startTag);

					if (match) {
						html = html.substring(match[0].length);
						match[0].replace(startTag, parseStartTag);
						chars = false;
					}
				} else if (html.indexOf("{{") == 0 ) {
					match = html.match(mustache);
					
					if (match) {
						html = html.substring(match[0].length);
						match[0].replace(mustache, parseMustache);
					}
				}

				if (chars) {
					index = html.search(txtBreak);

					var text = index < 0 ? html : html.substring(0, index);
					html = index < 0 ? "" : html.substring(index);

					if (handler.chars)
						handler.chars(text);
				}

			} else {
				html = html.replace(new RegExp("([\\s\\S]*?)<\/" + stack.last() + "[^>]*>"), function (all, text) {
					text = text.replace(/<!--([\s\S]*?)-->|<!\[CDATA\[([\s\S]*?)]]>/g, "$1$2");
					if (handler.chars)
						handler.chars(text);

					return "";
				});

				parseEndTag("", stack.last());
			}

			if (html == last)
				throw "Parse Error: " + html;
			last = html;
		}

		// Clean up any remaining tags
		parseEndTag();

		function parseStartTag(tag, tagName, rest, unary) {
			tagName = tagName.toLowerCase();

			if (block[tagName]) {
				while (stack.last() && inline[stack.last()]) {
					parseEndTag("", stack.last());
				}
			}

			if (closeSelf[tagName] && stack.last() == tagName) {
				parseEndTag("", tagName);
			}
			
			unary = empty[tagName] || !!unary;
			
			handler.start(tagName, unary);
			
			if (!unary) {
				stack.push(tagName);
			}
			// find attribute or special
			

			
			var attrs = [];

			rest.replace(attr, function (match, name) {
				if(arguments[5]) {
					handler.special(arguments[5])
				} else {
					var value = arguments[2] ? arguments[2] :
						arguments[3] ? arguments[3] :
						arguments[4] ? arguments[4] :
						fillAttrs[name] ? name : "";
					handler.attrStart(name);
					
					var last = mustache.lastIndex = 0;
					var res = mustache.exec(value);
					while(res) {
						var chars = value.substr(
							last, 
							mustache.lastIndex - res[0].length );
						handler.attrValue(chars);
						handler.special(res[1]);
						last = mustache.lastIndex;
						res = mustache.exec(value);
					}
					var chars = value.substr(
							last, 
							value.length );
					if(chars) {
						handler.attrValue(chars);
					}
					handler.attrEnd(name);
				}
			});

			handler.end(tagName,unary);
			
		}

		function parseEndTag(tag, tagName) {
			// If no tag name is provided, clean shop
			if (!tagName)
				var pos = 0;

				// Find the closest opened tag of the same type
			else
				for (var pos = stack.length - 1; pos >= 0; pos--)
					if (stack[pos] == tagName)
						break;

			if (pos >= 0) {
				// Close all the open elements, up the stack
				for (var i = stack.length - 1; i >= pos; i--)
					if (handler.end)
						handler.close(stack[i]);

				// Remove the open elements from the stack
				stack.length = pos;
			}
		}
		
		function parseMustache(mustache, inside){
			if(handler.special){
				handler.special(inside);
			}
		}
	};

	return HTMLParser;
	
})
