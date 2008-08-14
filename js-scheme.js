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
  date: '13 Aug 2008'
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
    this.isString = this.createMatcher(Tokens.STRING);
    this.isBinary = this.createMatcher(Tokens.BINARY);
    this.isDecimal = this.createMatcher(Tokens.DECIMAL);
    this.isHex = this.createMatcher(Tokens.HEX);
    this.isOctal = this.createMatcher(Tokens.OCTAL);
    var OR = '|';
    this.isNumber = this.createMatcher(Tokens.BINARY + OR + Tokens.DECIMAL +
				       OR + Tokens.HEX + OR + Tokens.OCTAL);
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
	throw "UnboundVariableError: " + name;
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
    if (names.length != values.length) {
      throw "IllegalArgumentError: Environment.multiExtend(names, values); " +
	"must be same number of names as values";
    }
    for (var i = 0; i < names.length; i++) {
      this.extend(names[i], values[i]);
    }
  },
  extension: function() {
    return new Environment(this);
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

var Warning = Class.create({
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
  return new Warning(message, 'Parse');
}

function IgnorableParseWarning(message) {
  return new Warning(message, 'IgnorableParse', true);
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
    c(new ReferenceError("unbound variable: " + expr));
  },
  getReserved: function(key)
  {
    return function(expr, env, c)
    {
      c(Util.format(expr));
    };
  }
};

var ReservedSymbolTable = new Hash({
  '+': function(args, c)
  {
    var sum = 0;
    for (var i = 0; i < args.length; i++) {
      sum += args[i];
    }
    c(sum);
  },
  '#t': true,
  '#f': false
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
    jscm_value(scm);
    REPL.reset();
  }
  return false;
};

function jscm_value(expr)
{
  jscm_eval(expr, GlobalEnvironment, jscm_print);
}

function jscm_eval(expr, env, c)
{
  jscm_expressionToAction(expr)(expr, env, c);
}

function jscm_evlis(arglis, env, c)
{
  var args = [];
  var collector = function(arglist) {
    if (Util.isNull(arglist)) {
      c(args);
    } else {
      jscm_eval(arglist[0], env, function(arg) {
		  args.push(arg);
		  collector(Util.cdr(arglist));
		});
    }
  };
  collector(arglis);
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
  if (obj instanceof Warning) {
    jscm_printBlock(';' + obj, 'warning');
  } else if (obj instanceof Error) {
    jscm_printBlock(';' + obj, 'error');
  } else {
    jscm_printBlock(';Value: ' + obj, 'value');
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
