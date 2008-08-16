/*******************************************************************************
 JS-SCHEME - a Scheme interpreter written in JavaScript
 (c) 2008 Erik Silkensen, erik@silkensen.com, version 0.2

 This program is free software: you can redistribute it and/or modify it under
 the terms of the GNU General Public License as published by the Free Software
 Foundation, either version 3 of the License, or (at your option) any later
 version.

 This program is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
 PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 this program.  If not, see <http://www.gnu.org/licenses/>.
*******************************************************************************/
var JSScheme = {
  author: 'Erik Silkensen',
  version: '0.2b r1',
  date: '16 Aug 2008'
};

var  Document = {
  CONSOLE: 'console',
  INPUT: 'input',
  PREFIX: 'prefix',
  INTRO: 'intro',
  KEY_DOWN: 40,
  KEY_UP: 38
};

var Tokens = {
  AND: 'and',
  BEGIN: 'begin',
  BINARY: '^#b[01]+$',
  COND: 'cond',
  DECIMAL: '^(#d)?([+-])?([0-9]+)?[.]?[0-9]+([eE][+-]?[0-9]+)?$',
  DEFINE: 'define',
  DELAY: 'delay',
  DOT: '.',
  ELSE: 'else',
  HEX: '^#x[0-9a-fA-F]+$',
  IDENTIFIER: '^[^\\\',\\"\\s\\(\\)]+$',
  IF: 'if',
  LAMBDA: 'lambda',
  LET: 'let',
  LETREC: 'letrec',
  LET_STAR: 'let*',
  L_PAREN: '(',
  NEWLINE: '\n',
  OCTAL: '^#o[0-7]+$',
  OR: 'or',
  QUOTE: 'quote',
  R_PAREN: ')',
  SEMI_COLON: ';',
  SET: 'set!',
  SINGLE_QUOTE: '\'',
  SPACE: ' ',
  STRING: '^[\\"](([^\\"\\\\]|([\\\\].))*)[\\"]'
};

var ActionTokens = { };
ActionTokens[Tokens.QUOTE] = true;
ActionTokens[Tokens.LAMBDA] = true;
ActionTokens[Tokens.LET] = true;
ActionTokens[Tokens.LETS] = true;
ActionTokens[Tokens.LETREC] = true;
ActionTokens[Tokens.SET] = true;
ActionTokens[Tokens.COND] = true;
ActionTokens[Tokens.IF] = true;
ActionTokens[Tokens.DEFINE] = true;
ActionTokens[Tokens.BEGIN] = true;
ActionTokens[Tokens.DELAY] = true;
ActionTokens[Tokens.EVAL] = true;

var Util = new (Class.create({
  initialize: function()
  {
    this._isIdentifier = this.createMatcher(Tokens.IDENTIFIER);
    this.isString = this.createMatcher(Tokens.STRING);
    this.isBinary = this.createMatcher(Tokens.BINARY);
    this.isDecimal = this.createMatcher(Tokens.DECIMAL);
    this.isHex = this.createMatcher(Tokens.HEX);
    this.isOctal = this.createMatcher(Tokens.OCTAL);
    var OR = '|';
    this.isNumber = this.createMatcher(Tokens.BINARY + OR + Tokens.DECIMAL +
				       OR + Tokens.HEX + OR + Tokens.OCTAL);
  },
  isIdentifier: function(expr)
  {
    return !this.isNumber(expr) && !this.isString(expr) &&
      this._isIdentifier(expr);
  },
  car: function(list)
  {
    return list[0];
  },
  cdr: function(list)
  {
    var tmp = list.clone();
    tmp.shift();
    return tmp;
  },
  cons: function(x, list)
  {
    var tmp = list.clone();
    tmp.unshift(x);
    return tmp;
  },
  createMatcher: function(regex)
  {
    return function(expr) {
      return new RegExp(regex).test(expr);
    };
  },
  getNumber: function(expr)
  {
    expr = expr.toString();
    if (this.isBinary(expr)) {
      var res = 0, pow = 0;
      for (var i = expr.length - 1; i > 1; i--) {
	res += parseInt(expr[i]) * Math.pow(2, expr.length - i - 1);
      }
      return res;
    } else if (this.isDecimal(expr)) {
      if (expr.indexOf('.') != -1) {
	return parseFloat(expr.replace('#d', ''));
      } else {
	return parseInt(expr.replace('#d', ''));
      }
    } else if (this.isHex(expr)) {
      return parseInt(expr.replace('#', '0'), 16);
    } else if (this.isOctal(expr)) {
      return parseInt(expr.replace('#o', ''), 8);
    } else {
      throw new TypeError(expr + " is not a number");
    }
  },
  getString: function(expr) {
    if (this.isString(expr)) {
      return new JSString(new RegExp(Tokens.STRING).exec(expr)[1]);
    } else {
      throw new TypeError(expr + " is not a string");
    }
  },
  isAtom: function(expr)
  {
    return !Object.isArray(expr);
  },
  isNull: function(expr)
  {
    return Object.isArray(expr) && expr.length == 0;
  },
  format: function(expr)
  {
    if (typeof expr == 'function') {
      return '#<procedure>';
    } else if (expr === true) {
      return '#t';
    } else if (expr === false) {
      return '#f';
    } else if (expr instanceof JSString) {
      return '"' + expr + '"';
    } else if (Object.isArray(expr) && expr[0] instanceof Pair) {
      var cpy = expr.clone();
      for (var i = 0; i < cpy.length; i++) {
	cpy[i] = cp[i].toString();
      }
      return Object.inspect(str2).gsub('[\\[]', '(').gsub(']',')').gsub(',','')
	.gsub('\'','');
    } else {
      return Object.inspect(expr).gsub('[\\[]','(').gsub(']',')').gsub(',','')
	.gsub('\'','');
    }
  },
  mapCmp: function(op, args) {
    for (var i = 1; i < args.length; i++) {
      if (op(this.car(args), args[i])) {
	return false;
      }
    }
    return true;
  },
  mapOp: function(op, initial, args, func) {
    var ans = this.getNumber(initial);
    if (!this.isNumber(ans))
      throw IllegalArgumentTypeError(func, ans, 1);
    for (var i = 0; i < args.length; i++) {
      if (!this.isNumber(args[i]))
	throw IllegalArgumentTypeError(func, args[i], i+1);
      ans = op(ans, this.getNumber(args[i]));
    }
    return ans;
  }
}))();

var JSString = Class.create({
  initialize: function(string) {
    this.string = string;
  },
  toString: function() {
    return this.string;
  }
});

var Escape = Class.create({
  initialize: function(cc, args) {
    this.cc = cc === undefined ? new Function() : cc;
    this.args = args;
  },
  invoke: function() {
    this.cc(this.args);
  }
});

var Promise = Class.create({
  initialize: function(e, env) {
    if (Promise.instances === undefined)
      Promise.instances = 0;
    this.promise = e;
    this.env = env;
    this.hasForced = false;
    this.id = ++Promise.instances;
  },
  force: function(c) {
    if (!this.hasForced) {
      this.promise = meaning(this.promise, this.env);
      this.hasForced = true;
    }
    c(this.promise);
  },
  toString: function() {
    return '#[promise ' + this.id + ']';
  }
});

var Pair = Class.create({
  initialize: function(car, cdr, parens) {
    this.car = car;
    this.cdr = cdr;
    this.parens = parens === undefined ? true : parens;
  },
  isEmpty: function() {
    return this.car === undefined && this.cdr === undefined;
  },
  isNullTerminated: function() {
    if (Util.isNull(this.cdr)) {
      return true;
    } else if (Object.isArray(this.cdr) && this.cdr.length == 1 &&
	       this.cdr[0] instanceof Pair) {
      return this.cdr[0].isNullTerminated();
    } else {
      return false;
    }
  },
  toStringList: function() {
    return Util.format(this.car) + (Util.isNull(this.cdr) ? '' : ' ' +
			       Util.format(this.cdr[0]));
  },
  toString: function() {
    if (this.isNullTerminated()) {
      return this.toStringList();
    }
    return (this.parens ? '(' : '') + Util.format(this.car) + ' . ' +
      Util.format(this.cdr) + (this.parens ? ')' : '');
  }
});

var Environment = Class.create({
  initialize: function(parent) {
    this.table = new Hash();
    this.parent = parent;
  },
  lookup: function(name) {
    if (this.table.get(name) === undefined) {
      if (this.parent === undefined) {
	throw UnboundVariableError(name);
      } else {
	return this.parent.lookup(name);
      }
    } else {
      return this.table.get(name);
    }
  },
  extend: function(name, value) {
    this.table.set(name, value);
  },
  multiExtend: function(names, values) {
    for (var i = 0; i < names.length; i++) {
      this.extend(names[i], values[i]);
    }
  },
  extension: function() {
    return new Environment(this);
  }
});

var Box = Class.create({
  initialize: function(obj) {
    this.obj = obj;
  },
  unbox: function() {
    return this.obj;
  },
  setbox: function(obj) {
    this.obj = obj;
  }
});

var Closure = Class.create({
  initialize: function(expr, env) {
    this.expr = expr;
    this.env = env;
  }
});

var History = Class.create({
  initialize: function(capacity) {
    this.capacity = capacity === undefined ? 100 : capacity;
    this.history = [];
  },
  get: function(index) {
    return this.history[index];
  },
  push: function(line) {
    if (this.history.length >= this.capacity - 1) {
      this.history = this.history.slice(0, this.capacity - 1);
    }
    this.history.unshift(line);
  },
  size: function() {
    return this.history.length;
  }
});

var JSError = Class.create({
  initialize: function(message, type) {
    this.message = message;
    this.type = type === undefined ? '' : type;
  },
  toString: function() {
    return this.type + 'Error: ' + this.message;
  }
});

function UnboundVariableError(message) {
  return new JSError(message, 'UnboundVariable');
}

function IllegalArgumentError(message) {
  return new JSError(message, 'IllegalArgument');
}

function IllegalArgumentCountError(func, how, req, cnt) {
  return IllegalArgumentError('The procedure ' + func + ' has been called' +
    ' with ' + cnt + ' argument' + (cnt == 1 ? ';' : 's;') + ' it requires ' +
      how + ' ' +  req + ' argument' + (req == 1 ? '.' : 's.'));
};
var IllegalArgumentTypeError = function(func, arg, cnt) {
  return IllegalArgumentError('The object ' + Util.format(arg) + ', passed as '+
    'argument ' + cnt + ' to ' + func + ', is not the correct type.');
};

var JSWarning = Class.create({
  initialize: function(message, type, ignorable) {
    this.message = message;
    this.type = type === undefined ? '' : type;
    this.ignorable = ignorable === undefined ? false : ignorable;
  },
  isIgnorable: function() {
    return this.ignorable;
  },
  toString: function() {
    return this.type + 'Warning: ' + this.message;
  }
});

function ParseWarning(message) {
  return new JSWarning(message, 'Parse');
}

function IgnorableParseWarning(message) {
  return new JSWarning(message, 'IgnorableParse', true);
}

var Lexer = Class.create({
  tokenize: function(expr) {
    var tokens = [];
    var open = 0;
    for (var i = 0; i < expr.length; i++) {
      if (expr[i] != Tokens.SPACE && expr[i] != Tokens.NEWLINE) {
	var token = this.nextToken(expr.substring(i));
	i += token.length - 1;
	if (token.length != 0) {
	  if (token == Tokens.L_PAREN) {
	    open++;
	  } else if (token == Tokens.R_PAREN) {
	    open--;
	  }
	  if (token[0] != Tokens.SEMI_COLON) {
	    tokens.push(token);
	  }
	}
      }
    }
    if (open < 0) {
      throw ParseWarning("unbalanced parens");
    } else if (open > 0) {
      throw IgnorableParseWarning("unbalanced parens");
    } else {
      return tokens;
    }
  },
  nextToken: function(expr) {
    if (expr[0] == Tokens.L_PAREN || expr[0] == Tokens.R_PAREN ||
	expr[0] == Tokens.SINGLE_QUOTE) {
      return expr[0];
    } else if (Util.isString(expr)) {
      return '"' + Util.getString(expr) + '"';
    } else if (expr[0] == Tokens.SEMI_COLON) {
      var comment = '';
      for (var i = 0; i < expr.length; i++) {
	if (expr[i] == Tokens.NEWLINE) {
	  break;
	} else {
	  comment += expr[i];
	}
      }
      return comment;
    } else {
      var sexpr = '';
      for (var i = 0; i < expr.length; i++) {
	if (expr[i] == Tokens.L_PAREN || expr[i] == Tokens.R_PAREN ||
	    expr[i] == Tokens.SPACE || expr[i] == Tokens.NEWLINE) {
	  break;
	} else {
	  sexpr += expr[i];
	}
      }
      return sexpr;
    }
  }
});

var Parser = Class.create({
  initialize: function() {
    this.lexer = new Lexer();
  },
  parse: function(expr) {
    var tokens = this.lexer.tokenize(expr);
    var stack = [];
    while (tokens.length > 0) {
      stack.push(this.nextSExpr(tokens));
    }
    if (stack.length == 0) {
      throw IgnorableParseWarning("empty");
    } else if (stack.length == 1) {
      return stack.pop();
    } else {
      throw ParseWarning("information overload!");
    }
  },
  nextSExpr: function(tokens) {
    if (tokens.length == 0) {
      return [];
    } else if (tokens[0] == Tokens.L_PAREN) {
      tokens.shift();
      return this.nextList(tokens);
    } else if (tokens[0] == Tokens.SINGLE_QUOTE) {
      tokens.shift();
      return [Tokens.QUOTE, this.nextSExpr(tokens)];
    } else {
      return tokens.shift();
    }
  },
  nextList: function(tokens) {
    var list = [];
    var next = this.nextSExpr(tokens);
    if (next == Tokens.DOT) {
      throw ParseWarning("Ill-formed dotted list; car is undefined.");
    }
    var pair = new Pair(undefined, undefined, false);
    while (tokens.length > 0 && next != Tokens.R_PAREN) {
      if (next != Tokens.DOT) {
	list.push(next);
      }
      var pp = (next instanceof Pair);
      next = this.nextSExpr(tokens);
      if (pp && next != Tokens.R_PAREN) {
	/* if the previous s-expression was a pair, it must either be nested
	 * with parens or be the last s-expression in the list
	 */
	throw ParseWarning("Ill-formed dotted list.");
      }
      if (next == Tokens.DOT) {
	if (pair.isEmpty()) {
	  pair.car = list.pop();
	  if (pair.car === undefined) {
	    throw new ParseWarning("Ill-formed dotted list; car is undefined.");
	  } else if (pair.car instanceof Pair) {
	    throw ParseWarning("Ill-formed dotted list; car is a Pair.");
	  }
	} else {
	  throw ParseWarning("Ill-formed dotted list.");
	}
      } else if (pair.car && pair.cdr === undefined) {
	pair.cdr = next;
	if (pair.cdr === undefined) {
	  throw ParseWarning("Ill-formed dotted list; cdr is undefined.");
	}
	next = pair;
      } else if (!pair.isEmpty() && next != Tokens.R_PAREN) {
	throw ParseWarning("Ill-formed dotted list.");
      }
    }
    return list;
  }
});

var Actions = {
  APPLICATION: function(expr, env, c)
  {
    jscm_eval(Util.car(expr), env, function(proc) {
		jscm_evlis(Util.cdr(expr), env, function(args) {
			     if (proc instanceof Builtin) {
			       proc = proc.apply;
			     }
			     if (typeof proc != 'function') {
			       throw new JSError('The object ' +
						 Util.format(proc) +
						 ' is not applicable.', 'Type');
			     }
			     proc(args, c);
			   });
	      });
  },
  CONST: function(expr, env, c)
  {
    if (Util.isNumber(expr)) {
      c(Util.getNumber(expr));
    } else if (Util.isString(expr)) {
      c(Util.getString(expr));
    } else if (ReservedSymbolTable.get(expr) != undefined) {
      c(ReservedSymbolTable.get(expr));
    } else {
      c(new ValueError(expr + " not recognized as CONST"));
    }
  },
  IDENTIFIER: function(expr, env, c)
  {
    c(env.lookup(expr).unbox());
  },
  getReserved: function(key)
  {
    return ReservedSymbolTable.get(key).apply;
  }
};

var Builtin = Class.create({
  initialize: function(name, apply, doc, argdoc) {
    this.name = name;
    this.apply = apply;
    this.doc = doc;
    this.argdoc = argdoc == undefined ? '' : argdoc;
  },
  toString: function() {
    return '#<builtin-procedure-' + this.name + '>';
  }
});

var SpecialForm = Class.create(Builtin, {
  initialize: function($super, name, apply, doc, argdoc) {
    $super(name, apply, doc, argdoc);
  },
  toString: function() {
    return '#[special-form-' + this.name + '>';
  }
});

var ReservedSymbolTable = new Hash({
  '#t': true,
  '#f': false,
  'abs': new Builtin('abs', function(args, c) {
    if (args.length != 1)
      throw IllegalArgumentCountError('abs', 'exactly', 1, args.length);
    if (!isNumber(args[0]))
      throw IllegalArgumentTypeError('abs', args[0], 1);
    c(Math.abs(args[0]));
  }, 'Returns the absolute value of <em>number</em>.', 'number'),
  'alert': new Builtin('alert', function(args, c) {
    c(alert(Util.format(args[0])));
  }, 'Calls the native JavaScript function alert(<em>obj</em>);', 'obj'),
  'and': new Builtin('and', function(args, c) {
    var val = true;
    for (var i = 0; i < args.length; i++) {
      val = args[i];
      if (val == false)
	break;
    }
    c(val);
  }, '<p>The logical <em>and</em> returns the last element in its argument ' +
   'list if no argument evaluates to #f.  Otherwise, returns #f.</p>' +
   '<p>Note: <b>#f</b> is the <u>only</u> false value in conditional ' +
   'expressions.</p>', 'obj<sub>1</sub> . obj<sub>n</sub>'),
  'append': new Builtin('append', function(args, c) {
    var res = undefined;
    if (args.length == 0) {
      res = [];
    } else if (args.length == 1) {
      res = args[0];
    } else {
      for (var i = 0; i < args.length; i++) {
	if (Util.isAtom(args[i]) && i < args.length - 1) {
	  throw IllegalArgumentTypeError('append', args[i], i + 1);
	} else if (Util.isAtom(args[i])) {
	  res.push(new Pair(res.pop(), args[i], false));
	} else {
	  for (var j = 0; j < args[i].length; j++) {
	    res.push(args[i][j]);
	  }
	}
      }
    }
    c(res);
   }, '<p>Returns a list consisting of the elements of the first ' +
     '<em>list</em> followed by the elements of the other <em>list</em>s.</p>' +
     '<p>The last argument may be any object; an improper list results if the' +
     ' last argument is not a proper list.</p>',
     'list<sub>1</sub> . obj<sub>n</sub>'),
  'apply': new Builtin('apply', function(args, c) {
    if (args.length == 0 || args.length > 2)
      throw IllegalArgumentCountError('apply', '', 'one or two', args.length);
    var proc = args[0];
    if (proc instanceof Builtin)
      proc = proc.apply;
    c(proc(args[1]));
  }, 'Applies <em>proc</em> to elements of the list <em>args</em>.',
     'proc args'),
  'atom?': new Builtin('atom?', function(args, c) {
    if (args.length != 1)
      throw IllegalArgumentCountError('atom?', 'exactly', 1, args.length);
    c(Util.isAtom(args[0]));
  },'<p>Returns #t if <em>obj</em> is an atom, and returns #f otherwise.</p>' +
    '<p>An <em>atom</em> is anything that is not a list. The empty list is ' +
    'not an atom.</p>', 'obj'),
  'begin': new SpecialForm('begin', function(e, env, c) {
    if (e.length == 1) {
      c(undefined);
    } else {
      jscm_eval(Util.cons(Util.cons(Tokens.LAMBDA,
                          Util.cons([], Util.cdr(e))),
		                    []), env, c);
    }
  }, 'The expressions are evaluated from left to rigt, and the value of the ' +
    'last expression is returned.',
    'expression<sub>1</sub> . expression<sub>n</sub>'),
  'call-with-current-continuation':
    new Builtin('call-with-current-continuation', function(args, c) {
      if (args.length != 1) {
	throw IllegalArgumentCountError('call-with-current-continuation',
	  'exactly', 1, args.length);
      } else if (typeof args[0] != 'function') {
	throw IllegalArgumentTypeError('call-with-current-continuation',
	  args[0], 1);
      }
      args[0]([function(val) {
		 c(val[0]);
		 throw new Escape();
	       }], c);
  }, '<p>Calls <em>proc</em> with the current continuation.</p>', 'proc'),
  'car': new Builtin('car', function(args, c) {
    var ans = undefined;
    if (args.length != 1) {
      throw IllegalArgumentCountError('car', 'exactly', 1, args.length);
    } else if (args[0] instanceof Pair) {
      ans = args[0].car;
    } else if (Util.isAtom(args[0]) || Util.isNull(args[0])) {
      throw IllegalArgumentTypeError('car', args[0], 1);
    } else if (args[0][0] instanceof Pair) {
      ans = args[0][0].car;
    } else {
      ans = args[0][0];
    }
    c(ans);
  }, '<p>Returns the contents of the car field of <em>pair</em>.</p>' +
    '<p>Note: it is an error to take the car of the empty list.</p>', 'pair'),
  'cdr': new Builtin('cdr', function(args, c) {
    var ans = undefined;
    if (args.length != 1) {
      throw IllegalArgumentCountError('cdr', 'exactly', 1, args.length);
    } else if (args[0] instanceof Pair) {
      ans = args[0].cdr;
    } else if (Util.isAtom(args[0]) || Util.isNull(args[0])) {
      throw IllegalArgumentTypeError('cdr', args[0], 1);
    } else if (args[0][0] instanceof Pair) {
      ans = args[0][0].cdr;
    } else {
      ans = Util.cdr(args[0]);
    }
    c(ans);
  },'<p>Returns the contents of the cdr field of <em>pair</em>.</p>' +
    '<p>Note: it is an error to take the cdr of the empty list.</p>', 'pair'),
  'clear-console': new Builtin('clear-console', function(args, c) {
    var divs = $$('#' + Document.CONSOLE + ' > div');
    for (var i = 0; i < divs.length; i++) {
      if (!divs[i].hasClassName(Document.INTRO)) {
	divs[i].remove();
      }
    }
    $(Document.INPUT).value = '';
    $(Document.INPUT).focus();
    throw new Escape();
  }, 'Clears the console display area.'),
  'cond': new SpecialForm('cond', function(e, env, c) {
    jscm_evcon(Util.cdr(e), env, c);
  },'<p>Each <em>clause</em> is a pair where the car is a <em>test</em> ' +
    'expression, and the cdr is the value of the cond expresion if the test ' +
    'evaluates to a true value.</p><p>The value of the first clause whose ' +
    'test is true is the value of the cond expression.</p>',
    'clause<sub>1</sub> clause<sub>2</sub> . clause<sub>n</sub>'),
  'cons': new Builtin('cons', function(args, c) {
    if (args.length != 2)
      throw IllegalArgumentCountError('cons', 'exactly', 2, args.length);
    if (Util.isAtom(args[1])) {
      c(new Pair(args[0], args[1]));
    } else {
      c(Util.cons(args[0], args[1]));
    }
  }, 'Returns a newly allocated pair whose car is <em>obj<sub>1</sub></em> ' +
    'and whose cdr is <em>obj<sub>2</sub></em>.',
    'obj<sub>1</sub> obj<sub>2</sub>'),
  'cos': new Builtin('cos', function(args, c) {
    if (args.length != 1)
      throw IllegalArgumentCountError('cos', 'exactly', 1, args.length);
    if (!Util.isNumber(args[0]))
      throw IllegalArgumentTypeError('cos', args[0], 1);
    c(Math.cos(args[0]));
  }, 'Returns the cosine (in radians) of <em>number</em> using the JavaScript' +
    ' <strong>Math.cos()</strong> function.', 'number'),
  'define': new SpecialForm('define', function(e, env, c) {
    var name = e[1];
    if (Util.isAtom(e[1])) {
      if (!Util.isIdentifier(name)) {
	throw new JSWarning(name + ' may not be defined.');
      } else if (ReservedSymbolTable.get(name) != undefined) {
	if (e.length == 2 || e.length == 3) {
	  if (e.length == 2) {
	    ReservedSymbolTable.set(name, 0);
	    c(name);
	  } else {
	    jscm_eval(e[2], env, function(val) {
			ReservedSymbolTable.set(name, val);
			c(name);
		      });
	  }
	} else {
	  throw IllegalArgumentCountError('define', '2 or', 3, args.length);
	}
      } else {
	if (e.length == 2 || e.length == 3) {
	  if (e.length == 2) {
	    env.extend(name, new Box(0));
	    c(name);
	  } else {
	    jscm_eval(e[2], env, function(val) {
			env.extend(name, new Box(val));
			c(name);
		      });
	  }
	} else {
	  throw IllegalArgumentCountError('define', '2 or', 3, args.length);
	}
      }
    } else if (!Util.isNull(name)) {
      name = e[1][0];
      if (!Util.isIdentifier(name)) {
	throw new JSWarning(name + ' may not be defined.');
      } else {
	var rhs = Util.cons(Tokens.LAMBDA,
		            Util.cons(Util.cdr(Util.car(Util.cdr(e))),
			              Util.cdr(Util.cdr(e))));
	if (ReservedSymbolTable.get(name) != undefined) {
	  jscm_eval(rhs, env, function(val) {
		      ReservedSymbolTable.set(name, val);
		      c(name);
		    });
	} else {
	  jscm_eval(rhs, env, function(val) {
		      env.extend(name, new Box(val));
		      c(name);
		    });
	}
      }
    } else {
      throw new JSError("I don't know what to do with that.", 'Syntax');
    }
  }, '<p>Defines a variable in the current environment that refers to the ' +
    'value of <em>expression</em>. The value of <em>expression</em> is not ' +
    'evaluated during the definition.  If no <em>expression</em> is present, ' +
    '0 will be used.</p><p>The alternative form of define may also be used to' +
    ' define procedures. This form is:</p><p>(define (proc [formals]) body)' +
    '<p></p>and is equivalent to</p><p>(define proc (lambda ([formals]) body))',
     'variable [expression]', 'variable [expression]'),
  'delay': new SpecialForm('delay', function(e, env, c) {
    if (e.length == 1)
      throw 'Ill-formed special form: ' + Util.format(e);
    c(new Promise(e[1], env));
  }, 'Returns a <em>promise</em> which at some point in the future may be ' +
    'asked (by the <strong>force</strong> procedure) to evaluate ' +
    '<em>expression</em>, and deliver the resulting value.', 'expression'),
  'display': new Builtin('display', function(args, c) {
    if (args.length != 1)
      throw IllegalArgumentCountError('display', 'exactly', 1, args.length);
    jscm_printDisplay(Util.format(args[0]));
    c(undefined);
  }, 'Prints <em>obj</em>.', 'obj'),
  'display-built-ins': new Builtin('display-built-ins', function(args, c) {
    throw new Escape(printBuiltinsHelp, args);
  }, 'Displays the list of built-in procedures.'),
  'else': true,
  'eval': new SpecialForm('eval', function(e, env, c) {
    if (e.length != 2)
      throw IllegalArgumentCountError('eval', 'exactly', 1, e.length - 1);
    jscm_eval(e[1], env, function(args) {
		if (Util.isAtom(args)) {
		  jscm_eval(REPL.parser.parse(args), env, c);
		} else if (!Util.isNull(args)) {
		  jscm_eval(args, env, c);
		} else {
		  throw IllegalArgumentTypeError('eval', args, 1);
		}
	      });
  }, '<p>Evaluates <em>expression</em> in the current environment.</p><p>' +
    '<em>expression</em> can either be a string Scheme ' +
    'expression, or a quoted external representation of a Scheme expression.' +
    '</p><p>For example,</p><p>(eval \'(+ 2 2)) => 4<br />(eval "(+ 2 2)") =>' +
    ' 4</p>', 'expression'),
  'even?': new Builtin('even?', function(args, c) {
    if (args.length != 1)
      throw IllegalArgumentCountError('even?', 'exactly', 1, args.length);
    if (!Util.isNumber(args[0]))
      throw IllegalArgumentTypeError('even?', args[0], 1);
    c(args[0] % 2 == 0);
  }, 'Returns #t if <em>n</em> is even, and #f otherwise.', 'n'),
  'eq?': new Builtin('eq?', function(args, c) {
    if (args.length != 2)
      throw IllegalArgumentCountError('eq?', 'exactly', 2, args.length);
    c(args[0] == args[1] || Util.isNull(args[0]) && Util.isNull(args[1]));
  }, '<p>Returns #t if <em>obj<sub>1</sub></em> is "equal" to ' +
    '<em>obj<sub>2</sub></em>.</p><p>This is currently determined using the' +
    ' JavaScript <strong>==</strong> operator.</p>',
    'obj<sub>1</sub> obj<sub>2</sub>'),
  'force': new Builtin('force', function(args, c) {
    if (args.length != 1)
      throw IllegalArgumentCountError('force', 'exactly', 1, args.length);
    if (!(args[0] instanceof Promise))
      throw IllegalArgumentTypeError('force', args[0], 1);
    args[0].force(c);
  }, 'Forces the value of <em>promise</em>.  If no value has been ' +
    'computed for the promise, then that value is computed, memoized, and ' +
    'returned.', 'promise'),
  'for-each': new Builtin('for-each', function(args, c) {
    if (args.length < 2)
      throw IllegalArgumentCountError('for-each', 'at least', 2, args.length);
    var proc = Util.car(args);
    var lists = Util.cdr(args);
    for (var i = 1; i < lists.length; i++) {
      if (lists[i].length != lists[0].length)
	throw IllegalArgumentError("all of the lists must be the same length");
    }
    for (var i = 0; i < lists[0].length; i++) {
      var pargs = [];
      for (var j = 0; j < lists.length; j++) {
	pargs.push(lists[j][i]);
      }
      if (proc instanceof Builtin)
	proc = proc.apply;
      if (typeof proc != 'function')
	throw IllegalArgumentTypeError('for-each', proc, 1);
      proc.apply(this, [pargs, function(k) { }]);
    }
    c(undefined);
  }, '<p>Applies <em>proc</em> element-wise to the elements of the ' +
    '<em>list</em>s and returns a list of the results, in order.</p>' +
    '<p><em>Proc</em> must be a function of as many arguments as there are ' +
    'lists specified.</p>', 'proc list<sub>1</sub> . list<sub>n</sub>'),
  'help': new Builtin('help', function(args, c) {
    throw new Escape(jscm_printHelp, args);
  }, 'Displays help information for JS-SCHEME.'),
  'if': new SpecialForm('if', function(e, env, c) {
    jscm_evif(Util.cdr(e), env, function(val) {
		c(val);
	      });
  }, 'An <strong>if</strong> expression ', 'test consequent [alternate]'),
  'lambda': new SpecialForm('lambda', function(e, env, c) {
    if (e[1].length != e[1].uniq().length)
      throw "Ill-formed special form: " + Util.format(e);
    c(function(args, k) {
      env = env.extension();
      if (e[1].length != args.length)
	throw IllegalArgumentCountError('#[compound-procedure]', 'exactly',
					e[1].length, args.length);
      var bargs = [];
      for (var i = 0; i < args.length; i++) {
	bargs[i] = new Box(args[i]);
      }
      env.multiExtend(e[1], bargs);
      jscm_beglis(Util.cdr(Util.cdr(e)), env, function(val) {
		    k(val);
		  });
    });
  }, 'Evaluates to a procedure.  Currently, the formals <u>must</u> be in ' +
    'the form of a list. <p><br />((lambda (a) (+ a 1)) 2) ==> 3 ' +
    '; procedure that adds 1 to a</p>',
    '(formals) body'),
  'length': new Builtin('length', function(args, c) {
    if (args.length != 1)
      throw IllegalArgumentCountError('length', 'exactly', 1, args.length);
    if (!Object.isArray(args[0]))
      throw IllegalArgumentTypeError('length', args[0], 1);
    c(args[0].length);
  }, 'Returns the length of <em>list</em>.', 'list'),
  'let': new Builtin('let', function(e, env, c) {
    var expr = Util.cons(Util.cons(Tokens.LAMBDA,
                                   Util.cons(Util.map(function(el) {
			                         return Util.car(el);
				               }, Util.car(Util.cdr(e))),
				             (Util.cdr(Util.cdr(e))))),
			 Util.map(function(el) {
			     return (Util.car(Util.cdr(el)));
			   }, Util.car(Util.cdr(e))));
    jscm_eval(expr, env, function(val) {
		c(val);
	      });
  }, '<p><em>bindings</em> is a list of pairs where the form of the pair is: ' +
    '</p><p>(<em>variable</em> <em>init</em>)</p><p>Each <em>init</em> is ' +
    'evaluated in the current environment, in some unspecified order, and ' +
    'bound to the corresponding <em>variable</em>.</p>' +
    '<p><em>body</em> is a sequence of expressions to be evaluated; the ' +
    'value of the last expression is the value of the let expression.</p>' +
    '<p><em>body</em> is evaluated in an extended environment.</p>',
     'bindings body'),
  'let*': new Builtin('let*', function(e, env, c) {
    var help = function(e, b) {
      if (Util.isNull(e)) {
	return [];
      } else if (e.length == 1) {
	return Util.cons(Util.cons(Tokens.LAMBDA,
			 Util.cons(Util.cons(Util.car(Util.car(e)),
				   []),
			      b)),
		    Util.cons(Util.car(Util.cdr(Util.car(e))),
			 []));
      } else {
	return Util.cons(Util.cons(Tokens.LAMBDA,
			 Util.cons(Util.cons(Util.car(Util.car(e)),
				   []),
			      Util.cons(help(Util.cdr(e), b),
			           []))),
		    Util.cons(Util.car(Util.cdr(Util.car(e))),
		         []));
      }
    };
    var expr = help(Util.car(Util.cdr(e)), Util.cdr(Util.cdr(e)));
    jscm_eval(expr, env, function(val) {
		c(val);
	      });
  }, '<p><em>bindings</em> is a list of pairs where the form of the pair is: ' +
    '</p><p>(<em>variable</em> <em>init</em>)</p><p>Each <em>init</em> is ' +
    'evaluated sequentially from left to right, where each binding to the ' +
    'left of the one being evaluated is visible to the one being evaluated, ' +
    'and bound to the corresponding <em>variable</em>.</p>' +
    '<p><em>body</em> is a sequence of expressions to be evaluated; the ' +
    'value of the last expression is the value of the let expression.</p>' +
    '<p><em>body</em> is evaluated in an extended environment.</p>',
     'bindings body'),
  'letrec': new SpecialForm('letrec', function(e, env, c) {
    var body = Util.cdr(Util.cdr(e));
    var col = function(li) {
      body = Util.cons(Util.cons(Tokens.DEFINE,
		       Util.cons(Util.car(li),
			    Util.cdr(li))),
		  body);
    };
    Util.map(col, Util.car(Util.cdr(e)));
    var lisp = Util.cons(Util.cons(Tokens.LAMBDA,
			 Util.cons([], body)),
		    []);
    jscm_eval(lisp, env, function(val) {
		c(val);
	      });
  }, '<p><em>bindings</em> is a list of pairs where the form of the pair is: ' +
    '</p><p>(<em>variable</em> <em>init</em>)</p><p>Each <em>init</em> is ' +
    'bound to the corresponding <em>variable</em>, in some unspecified ' +
    'order, where the region of each binding of a variable is the entire ' +
    'letrec expression.</p>' +
    '<p><em>body</em> is a sequence of expressions to be evaluated; the ' +
    'value of the last expression is the value of the let expression.</p>' +
    '<p><em>body</em> is evaluated in an extended environment.</p>',
     'bindings body'),
  'list': new Builtin('list', function(args, c) {
    c(args);
  }, 'Returns a list made up of the arguments.',
    'obj<sub>1</sub> . obj<sub>n</sub>'),
  'list?': new Builtin('list?', function(args, c) {
    if (args.length != 1) {
      throw IllegalArgumentCountError('list?', 'exactly', 1, args.length);
    } else if (Util.isAtom(args[0])) {
      c(false);
    } else if (Util.isNull(args[0])) {
      c(true);
    } else {
      var ans = true;
      for (var i = 0; i < args[0].length; i++) {
	if (Util.isAtom(args[0][i]) && (args[0][i] instanceof Pair) &&
	    !Util.isNull(args[0][i].cdr)) {
	    ans = false;
	    break;
	}
	c(ans);
      }
    }
  }, 'Returns #t if <em>obj</em> is a list, and returns #f otherwise.', 'obj'),
 'map': new Builtin('map', function(args, c) {
    if (args.length < 2)
      throw IllegalArgumentCountError('map', 'at least', 2, args.length);
    var proc = args[0];
    var lists = Util.cdr(args);
    for (var i = 1; i < lists.length; i++) {
      if (lists[i].length != lists[0].length)
	throw "IllegalArgumentError: all of the lists must be the same length";
    }
    var res = [];
    for (var j = 0; j < lists[0].length; j++) {
      var pargs = [];
      for (var k = 0; k < lists.length; k++) {
	pargs.push(lists[k][j]);
      }
      if (proc instanceof Builtin)
	proc = proc.apply;
      if (typeof proc != 'function')
	throw IllegalArgumentTypeError('map', proc, 1);
      proc.apply(this, [pargs, function(val) {
		   res.push(val);
		 }]);
    }
    c(res);
  }, '<p>Applies <em>proc</em> element-wise to the elements of the ' +
    '<em>list</em>s and returns a list of the results, in order.</p>' +
    '<p><em>Proc</em> must be a function of as many arguments as there are ' +
    'lists specified.</p>', 'proc list<sub>1</sub> . list<sub>n</sub>'),
  'not': new Builtin('not', function(args, c) {
    if (args.length != 1)
      throw IllegalArgumentCountError('not', 'exactly', 1, args.length);
    c(args[0] == false);
  },'<p><em>not</em> returns #t if <em>obj</em> is false, and returns #f ' +
   'otherwise.</p><p>Note: <b>#f</b> is the <u>only</u> false value in ' +
   'conditional expressions.</p>', 'obj'),
  'null?': new Builtin('null?', function(args, c) {
    if (args.length != 1)
      throw IllegalArgumentCountError('null?', 'exactly', 1, args.length);
    c(Util.isNull(args[0]));
  }, 'Returns #t if <em>obj</em> is the empty list, and returns #f otherwise.',
    'obj'),
  'number?': new Builtin('number?', function(args, c) {
    if (args.length != 1)
      throw IllegalArgumentCountError('number?', 'exactly', 1, args.length);
    c(Util.isNumber(args[0]));
  }, 'Returns #t if <em>obj</em> is a number, and returns #f otherwise.',
    'obj'),
  'odd?': new Builtin('odd?', function(args, c) {
    if (args.length != 1)
      throw IllegalArgumentCountError('odd?', 'exactly', 1, args.length);
    if (!Util.isNumber(args[0]))
      throw IllegalArgumentTypeError('odd?', args[0], 1);
    c(args[0] % 2 != 0);
  }, 'Returns #t if <em>n</em> is odd, and returns #f otherwise.', 'n'),
 'or': new Builtin('or', function(args, c) {
   var ans = false;
   for (var i = 0; i < args.length; i++) {
     if (args[i]) {
       ans = args[i];
       break;
     }
   }
   c(ans);
  },'<p>The logical <em>or</em> returns the first element in its argument ' +
   'list that doesn\'t evaluate to #f.  Otherwise, returns #f.</p>' +
   '<p>Note: <b>#f</b> is the <u>only</u> false value in conditional ' +
   'expressions.</p>', 'obj<sub>1</sub> . obj<sub>n</sub>'),
  'pair?': new Builtin('pair?', function(args, c) {
    if (args.length != 1)
      throw IllegalArgumentCountError('pair?', 'exactly', 1, args.length);
    c(!Util.isNull(args[0]) && !Util.isAtom(args[0]));
  }, 'Returns #t if <em>obj</em> is a pair, and returns #f otherwise.', 'obj'),
  'expt': new Builtin('expt', function(args, c) {
    if (args.length != 2)
      throw IllegalArgumentCountError('expt', 'exactly', 1, args.length);
    if (!Util.isNumber(args[0]))
      throw IllegalArgumentTypeError('expt', args[0], 1);
    if (!Util.isNumber(args[1]))
      throw IllegalArgumentTypeError('expt', args[1], 2);
    c(Math.pow(args[0], args[1]));
  }, 'Returns <em>a</em> to the power of <em>b</em>.', 'a b'),
  'quote': new Builtin('quote', function(e, env, c) {
    return function(args, c) {
      if (args.length != 1)
	throw IllegalArgumentCountError('quote', 'exactly', 1, args.length);
      c(args[0]);
    }(Util.cdr(e), c);
  }, '<p>Evaluates to <em>datum</em>.</p><p>The single-quote character ' +
    '<strong>\'</strong> may also be used as an abbreviation, where ' +
    '<strong>\'<em>datum</em></strong> is equivalent to <strong>(quote <em>' +
    'datum</em></strong>)</p>', 'datum'),
  'reverse': new Builtin('reverse', function(args, c) {
    if (args.length != 1)
      throw IllegalArgumentCountError('reverse', 'exactly', 1, args.length);
    if (!Object.isArray(args[0]))
      throw IllegalArgumentTypeError('reverse', args[0], 1);
    c(args[0].reverse(false));
  }, 'Returns a newly allocated list containing the elements of ' +
    '<em>list</em> in reverse order.', 'list'),
  'set!': new SpecialForm('set!', function(e, env, c) {
    var oldBox = env.lookup(e[1]);
    var old = oldBox.unbox();
    var rhs = Util.isNull(Util.cdr(Util.cdr(e))) ? 0 : e[2];
    jscm_eval(rhs, env, function(val) {
		oldBox.setbox(val);
		c(old);
	      });
  }, 'Similar to <strong>define</strong>, except that <em>variable</em> must ' +
    'already be in the environment. If no <em>expression</em> is present, ' +
    '0 is used. Returns the original value that <em>variable</em> referred to.',
    'variable [expression]'),
  'sin': new Builtin('sin', function(args, c) {
    if (args.length != 1)
      throw IllegalArgumentCountError('sin', 'exactly', 1, args.length);
    if (!Util.isNumber(args[0]))
      throw IllegalArgumentTypeError('sin', args[0], 1);
    c(Math.cos(args[0]));
  }, 'Returns the sine (in radians) of <em>number</em> using the JavaScript ' +
    '<strong>Math.sin()</strong> function.', 'number'),
  'tan': new Builtin('tan', function(args, c) {
    if (args.length != 1)
      throw IllegalArgumentCountError('tan', 'exactly', 1, args.length);
    if (!Util.isNumber(args[0]))
      throw IllegalArgumentTypeError('tan', args[0], 1);
    c(Math.tan(args[0]));
  }, 'Returns the tangent (in radians) of <em>number</em> using the ' +
    'JavaScript <strong>Math.tan()</strong> function.', 'number'),
  'zero?': new Builtin('zero?', function(args, c) {
    if (args.length != 1)
      throw IllegalArgumentCountError('zero?', 'exactly', 1, args.length);
    if (!Util.isNumber(args[0]))
      throw IllegalArgumentTypeError('zero?', args[0], 1);
    c(args[0] === 0);
  }, 'Returns #t if <em>number</em> is 0, and returns #f otherwise.', 'number'),
  '=': new Builtin('=', function(args, c) {
    c(Util.mapCmp(function(lhs, rhs) { return lhs != rhs; }, args));
  }, 'Returns #t if every argument is "equal," and returns #f otherwise. ' +
    'Equality is determined using the JavaScript <strong>==</strong> operator.',
    'obj<sub>1</sub> . obj<sub>n</sub>'),
  '<': new Builtin('<', function(args, c) {
    c(Util.mapCmp(function(lhs, rhs) { return lhs >= rhs; }, args));
  }, 'Returns #t if the first argument is less than every other argument, and' +
    ' returns #f otherwise.', 'number<sub>1</sub> . number<sub>n</sub>'),
  '>': new Builtin('>', function(args, c) {
    c(Util.mapCmp(function(lhs, rhs) { return lhs <= rhs; }, args));
  }, 'Returns #t if the first argument is greater than every other argument, ' +
    'and returns #f otherwise.', 'number<sub>1</sub> . number<sub>n</sub>'),
  '<=': new Builtin('<=', function(args, c) {
    c(Util.mapCmp(function(lhs, rhs) { return lhs > rhs; }, args));
  }, 'Returns #t if the first argument is less than or equal to every other ' +
    'argument, and returns #f otherwise.', 'number<sub>1</sub> . number<sub>' +
    'n</sub>'),
  '>=': new Builtin('>=', function(args, c) {
    c(Util.mapCmp(function(lhs, rhs) { return lhs < rhs; }, args));
  }, 'Returns #t if the first argument is greater than or equal to every ' +
    'other argument, and returns #f otherwise.',
    'number<sub>1</sub> . number<sub>n</sub>'),
  '+': new Builtin('+', function(args, c) {
    c(Util.mapOp(function(lhs, rhs) { return lhs + rhs; }, 0, args, '+'));
  }, 'Returns the sum of the arguments.',
    'number<sub>1</sub> . number<sub>n</sub>'),
  '-': new Builtin('-', function(args, c) {
    if (args.length == 0) {
      throw IllegalArgumentCountError('-', 'at least', 2, args.length);
    } else if (args.length == 1 && Util.isNumber(args[0])) {
      c(arg[0] * -1);
    } else if (args.length == 1) {
      throw IllegalArgumentTypeError('-', args[0], 1);
    } else {
      var ans = args[0];
      if (!Util.isNumber(ans))
	throw IllegalArgumentTypeError('-', ans, 1);
      for (var i = 1; i < args.length; i++) {
	if (!Util.isNumber(args[i]))
	  throw IllegalArgumentTypeError('-' ,args[i], i+1);
	ans -= args[i];
      }
      c(ans);
    }
  }, 'With two or more arguments, returns the difference of the arguments. ' +
    'With one argument, returns the additive inverse of the argument.',
    'number<sub>1</sub> . number<sub>n</sub>'),
  '*': new Builtin('*', function(args, c) {
    c(Util.mapOp(function(lhs, rhs) { return lhs * rhs; }, 1, args, '*'));
  }, 'Returns the product of the arguments.  With one argument, returns that ' +
    'argument multiplied by 1.  With no arguments, returns 1.',
    'number<sub>1</sub> . number<sub>n</sub>'),
  '/': new Builtin('/', function(args, c) {
    if (args.length == 0) {
      throw IllegalArgumentCountError('/', 'at least', 1, args.length);
    } else if (args.length == 1) {
      c(1 / args[0]);
    } else {
      c(Util.mapOp(function(lhs, rhs) { return lhs / rhs; }, args[0],
		   Util.cdr(args),'/'));
    }
  }, 'Returns the quotient of the arguments. With one argument, returns the ' +
    'multiplicative inverse of the argument.',
    'number<sub>1</sub> . number<sub>n</sub>')
});

var Interpreter = Class.create({
  initialize: function()
  {
    this.parser = new Parser();
    this.history = new History();
    this.buffer = [];
    this.expr = '';
    this.histid = 0;
    this.lineno = 0;
    this.histline = '';
    this.histprog = false;
    this.DEFAULT_PREFIX = '&gt;&nbsp;';
    this.CONTINUE_PREFIX = '<span class="continue">..&nbsp;</span>';
    this.prefix = this.DEFAULT_PREFIX;
  },
  reset: function()
  {
    this.lineno = 0;
    this.expr = '';
    this.prefix = this.DEFAULT_PREFIX;
  },
  focus: function()
  {
    $(Document.INPUT).focus();
  },
  getline: function()
  {
    return $F(Document.INPUT);
  },
  setline: function(line)
  {
    $(Document.INPUT).value = line;
  },
  updateprefix: function(prefix)
  {
    prefix = prefix === undefined ? this.prefix : prefix;
    $(Document.PREFIX).update(prefix);
  }
});

function jscm_repl()
{
  if (REPL.expr.length == 0 && REPL.getline().strip().length == 0) {
    jscm_printElement();
  } else {
    REPL.lineno++;
    REPL.histid = 0;
    REPL.history.push(REPL.getline());
    REPL.histline = '';
    REPL.histprog = false;
    REPL.expr += Tokens.NEWLINE + REPL.getline();
    var scm = undefined;
    try {
      scm = REPL.parser.parse(REPL.expr);
    } catch (e) {
      if (e.isIgnorable()) {
	REPL.prefix = REPL.CONTINUE_PREFIX;
	var prefix = REPL.lineno == 1 ? REPL.DEFAULT_PREFIX : REPL.prefix;
	jscm_printElement(undefined, prefix);
	REPL.updateprefix();
      } else {
	jscm_print(e);
	REPL.reset();
      }
      return false;
    }
    try {
      jscm_eval(scm, GlobalEnvironment, jscm_print);
    } catch (e) {
      if (e instanceof Escape) {
	e.invoke();
      } else {
	jscm_print(e);
      }
    }
    REPL.reset();
  }
  return false;
};

function jscm_eval(expr, env, c)
{
  jscm_expressionToAction(expr)(expr, env, c);
}

function jscm_beglis(es, env, c)
{
  var begger = function(elist) {
    if (Util.isNull(Util.cdr(elist))) {
      jscm_eval(elist[0], env, function(val) {
		  c(val);
		});
    } else {
      jscm_eval(elist[0], env, function(val) {
		  begger(Util.cdr(elist));
		});
    }
  };
  begger(es);
}

function jscm_evlis(arglis, env, c)
{
  if (Util.isNull(arglis)) {
    c([]);
  } else {
    jscm_evlis(Util.cdr(arglis), env, function(arg) {
		 jscm_eval(arglis[0], env, function(carg) {
			     c(Util.cons(carg, arg));
			   });
	       });
  }
}

function jscm_evcon(lines, env, c)
{
  jscm_eval(lines[0][0], env, function(test) {
	      if (test) {
		jscm_eval(lines[0][1], env, c);
	      } else {
		jscm_evcon(Util.cdr(lines), env, c);
	      }
	    });
}

function jscm_evif(args, env, c)
{
  jscm_eval(args[0], env, function(test) {
	      if (test) {
		jscm_eval(args[1], env, c);
	      } else if (args.length < 3) {
		c(undefined);
	      } else {
		jscm_eval(args[2], env, c);
	      }
	    });
}

function jscm_expressionToAction(expr)
{
  return Util.isAtom(expr) ? jscm_atomToAction(expr) : jscm_listToAction(expr);
}

function jscm_atomToAction(atom)
{
  return Util.isNumber(atom) || Util.isString(atom) ||
    ReservedSymbolTable.get(atom) != undefined ?
      Actions.CONST : Actions.IDENTIFIER;
}

function jscm_listToAction(list)
{
    return Util.isAtom(list[0]) && ActionTokens[list[0]] ?
      Actions.getReserved(list[0]) : Actions.APPLICATION;
}

function jscm_print(obj)
{
  if (obj instanceof JSWarning) {
    jscm_printBlock(';' + obj, 'warning');
  } else if ((obj instanceof Error) || (obj instanceof JSError)) {
    jscm_printBlock(';' + obj, 'error');
  } else {
    jscm_printBlock(';Value: ' + Util.format(obj), 'value');
  }
}

function jscm_printElement(element, prefix)
{
  prefix = prefix === undefined ? REPL.prefix : prefix;
  var div = document.createElement('div');
  var pre = document.createElement('span');
  pre.update(prefix);
  var expr = document.createElement('pre');
  expr.addClassName(Document.INPUT);
  expr.appendChild(document.createTextNode(REPL.getline()));
  var line = document.createElement('span');
  line.addClassName('line');
  line.appendChild(pre);
  line.appendChild(expr);
  div.appendChild(line);
  for (var i = 0; i < REPL.buffer.length; i++) {
    div.appendChild(REPL.buffer[i]);
  }
  REPL.buffer = [];
  if (element) {
    div.appendChild(element);
  }
  $(Document.CONSOLE).appendChild(div);
  REPL.setline('');
  REPL.focus();
  REPL.updateprefix(REPL.DEFAULT_PREFIX);
  window.scrollTo(0, document.body.scrollHeight);
}

function jscm_printBlock(text, className)
{
  var span = document.createElement('span');
  span.addClassName(className);
  span.addClassName('block');
  span.appendChild(document.createTextNode(text));
  jscm_printElement(span);
}

function jscm_onkeydown(e)
{
  var code = e.keyCode;
  if (code == Document.KEY_DOWN && REPL.histid > 0) {
    if (REPL.histid >= REPL.history.size()) {
      REPL.histid = REPL.history.size() - 1;
    }
    var ln = REPL.histid > 0 ? REPL.history.get(--REPL.histid) : REPL.histline;
    REPL.setline(ln);
    REPL.focus();
  } else if (code == Document.KEY_UP && REPL.histid < REPL.history.size()) {
    if (!REPL.histprog) {
      REPL.histline = REPL.getline();
    }
    REPL.histprog = true;
    if (REPL.histid < 0) {
      REPL.histid = 0;
    }
    REPL.setline(REPL.history.get(REPL.histid++));
    REPL.focus();
  } else if (code == Document.KEY_DOWN) {
    REPL.setline(REPL.histline);
    REPL.histid = 0;
    REPL.focus();
  } else if (code != Document.KEY_UP) {
    REPL.histprog = false;
  }
}

window.onload = function() {
  GlobalEnvironment = new Environment();
  REPL = new Interpreter();
  $(Document.INPUT).onkeydown = jscm_onkeydown;
  REPL.focus();
};
