/*******************************************************************************
 JS-SCHEME - a Scheme interpreter written in JavaScript
 (c) 2008 Erik Silkensen, erik@silkensen.com, version 0.1

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
  version: '0.1b r2',
  date: '5 Aug 2008'
};

var Document = {
  CONSOLE: 'console',
  INPUT: 'input',
  PREFIX: 'prefix',
  INTRO: 'intro',
  KEY_DOWN: 40,
  KEY_UP: 38
};

var Numbers = {
  BINARY: '^#b[01]+$',
  DECIMAL: '^(#d)?([+-])?([0-9]+)?[.]?[0-9]+([eE][+-]?[0-9]+)?$',
  HEX: '^#x[0-9a-fA-F]+$',
  OCTAL: '^#o[0-7]+$'
};

var Tokens = {
  BEGIN: 'begin',
  COND: 'cond',
  DEFINE: 'define',
  DELAY: 'delay',
  EVAL: 'eval',
  DOT: '.',
  ELSE: 'else',
  IDENTIFIER: '^[^\\\',\\"\\s\\(\\)]+$',
  IF: 'if',
  LAMBDA: 'lambda',
  LET: 'let',
  LETS: 'let*',
  LETREC: 'letrec',
  L_PAREN: '(',
  NEWLINE: '\n',
  NUMBER: Numbers.DECIMAL+'|'+Numbers.BINARY+'|'+Numbers.HEX+'|'+Numbers.OCTAL,
  QUOTE: 'quote',
  R_PAREN: ')',
  SEMI_COLON: ';',
  SET: 'set!',
  SINGLE_QUOTE: '\'',
  SPACE: ' ',
  STRING: '^[\\"](([^\\"\\\\]|([\\\\].))*)[\\"]'
};

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

var GlobalEnvironment = new Environment();

var box = function(it) {
  return function(sel) {
    return sel(it, function(new_) { it = new_; });
  };
};
var setbox = function(box, new_) {
  return box(function(it, set) { return set(new_); });
};
var unbox = function(box) {
  return box(function(it, set) { return it; });
};
var boxAll = function(vals) {
  if (isNull(vals))
    return [];
  return cons(box(car(vals)), boxAll(cdr(vals)));
};
var beglis = function(es, env) {
  if (isNull(cdr(es)))
    return meaning(car(es), env);
  meaning(car(es), env);
  return beglis(cdr(es), env);
};
var evlis = function(args, env) {
  if (isNull(args))
    return [];
  return cons(meaning(car(args), env), evlis(cdr(args), env));
};
var evcon = function(lines, env) {
  if (isElse(questionOf(car(lines))))
    return meaning(answerOf(car(lines)), env);
  if (meaning(questionOf(car(lines)), env))
    return meaning(answerOf(car(lines)), env);
  return evcon(cdr(lines), env);
};
var evif = function(lines, env) {
  if (meaning(questionOf(lines), env))
    return meaning(second(lines), env);
  return lines.length < 3 ? undefined : meaning(third(lines), env);
};
var value = function(e) {
  return meaning(e, GlobalEnvironment);
};
var meaning = function(e, env) {
  var action = expressionToAction(e);
  if (action instanceof Action)
    return action.apply(e, env);
};
var expressionToAction = function(e) {
  if (isAtom(e))
    return atomToAction(e);
  return listToAction(e);
};
var atomToAction = function(e) {
  if (isNumber(e))
    return Actions.CONST;
  if (isString(e))
    return Actions.CONST;
  if (ReservedSymbolTable.get(e) != undefined)
    return Actions.CONST;
  return Actions.IDENTIFIER;
};
var listToAction = function(e) {
  if (isAtom(car(e))) {
    if (car(e) == Tokens.QUOTE)
      return Actions.getReserved(Tokens.QUOTE);
    if (car(e) == Tokens.LAMBDA)
      return Actions.getReserved(Tokens.LAMBDA);
    if (car(e) == Tokens.LET)
      return Actions.getReserved(Tokens.LET);
    if (car(e) == Tokens.LETS)
      return Actions.getReserved(Tokens.LETS);
    if (car(e) == Tokens.LETREC)
      return Actions.getReserved(Tokens.LETREC);
    if (car(e) == Tokens.SET)
      return Actions.getReserved(Tokens.SET);
    if (car(e) == Tokens.COND)
      return Actions.getReserved(Tokens.COND);
    if (car(e) == Tokens.IF)
      return Actions.getReserved(Tokens.IF);
    if (car(e) == Tokens.DEFINE)
      return Actions.getReserved(Tokens.DEFINE);
    if (car(e) == Tokens.BEGIN)
      return Actions.getReserved(Tokens.BEGIN);
    if (car(e) == Tokens.DELAY)
      return Actions.getReserved(Tokens.DELAY);
    if (car(e) == Tokens.EVAL)
      return Actions.getReserved(Tokens.EVAL);
  }
  return Actions.APPLICATION;
};

var Action = Class.create({
  initialize: function(id, apply) {
    this.id = id;
    this.apply = apply;
  }
});

var Actions = {
  APPLICATION: new Action('application', function(e, env) {
    if (isNull(e))
      return [];
    if (isNumber(car(e)) || isString(car(e)) || isNull(car(e)))
      throw "TypeError: The object " + format(car(e)) + " is not applicable.";
    var proc = meaning(functionOf(e), env);
    if (proc instanceof Builtin)
      proc = proc.apply;
    return proc(evlis(argumentsOf(e), env));
  }),
  CONST: new Action('const', function(e, env) {
    if (isNumber(e))
      return getNumber(e);
    if (isString(e))
      return getString(e);
    if (ReservedSymbolTable.get(e) != undefined)
      return ReservedSymbolTable.get(e);
    throw "ValueError: " + e + " not recognized as CONST";
  }),
  IDENTIFIER: new Action('identifier', function(e, env) {
    return unbox(env.lookup(e));
  }),
  getReserved: function(key) {
    return new Action(key, function(e, env) {
      return ReservedSymbolTable.get(key).apply(e, env);
    });
  }
};

var Escape = Class.create({
  initialize: function(cc, args) {
    this.cc = cc === undefined ? new Function() : cc;
    this.args = args;
  },
  invoke: function() {
    this.cc(this.args);
  }
});

var CallCCEscape = Class.create({
  initialize: function(arg) {
    this.arg = arg;
  },
  toString: function() {
    return '#[continuation ' + this.arg + ']';
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
    if (isNull(this.cdr)) {
      return true;
    } else if (Object.isArray(this.cdr) && this.cdr.length == 1 &&
	       this.cdr[0] instanceof Pair) {
      return this.cdr[0].isNullTerminated();
    } else {
      return false;
    }
  },
  toStringList: function() {
    return format(this.car) + (isNull(this.cdr) ? '' : ' ' +
			       format(this.cdr[0]));
  },
  toString: function() {
    if (this.isNullTerminated()) {
      return this.toStringList();
    }
    return (this.parens ? '(' : '') + format(this.car) + ' . ' +
      format(this.cdr) + (this.parens ? ')' : '');
  }
});

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

var ReservedSymbolTable = new Hash({
  '#t': true,
  '#f': false,
  'abs': new Builtin('abs', function(args) {
    if (args.length != 1)
      throw IllegalArgumentCountError('abs', 'exactly', 1, args.length);
    if (!isNumber(args[0]))
      throw IllegalArgumentTypeError('abs', args[0], 1);
    return Math.abs(args[0]);
  }, 'Returns the absolute value of <em>number</em>.', 'number'),
  'alert': new Builtin('alert', function(args) {
    return alert(format(first(args)));
  }, 'Calls the native JavaScript function alert(<em>obj</em>);', 'obj'),
  'and': new Builtin('and', function(args) {
    var val = true;
    for (var i = 0; i < args.length; i++) {
      val = args[i];
      if (val == false)
	return false;
    }
    return val;
  }, '<p>The logical <em>and</em> returns the last element in its argument ' +
   'list if no argument evaluates to #f.  Otherwise, returns #f.</p>' +
   '<p>Note: <b>#f</b> is the <u>only</u> false value in conditional ' +
   'expressions.</p>', 'obj<sub>1</sub> . obj<sub>n</sub>'),
   'append': new Builtin('append', function(args) {
     if (args.length == 0)
       return [];
     else if (args.length == 1)
       return args[0];
     var res = [];
     for (var i = 0; i < args.length; i++) {
       if (isAtom(args[i]) && i < args.length - 1) {
	 throw IllegalArgumentTypeError('append', args[i], i + 1);
       } else if (isAtom(args[i])) {
	 res.push(new Pair(res.pop(), args[i], false));
       } else {
	 for (var j = 0; j < args[i].length; j++)
	   res.push(args[i][j]);
       }
     }
     return res;
   }, '<p>Returns a list consisting of the elements of the first ' +
     '<em>list</em> followed by the elements of the other <em>list</em>s.</p>' +
     '<p>The last argument may be any object; an improper list results if the' +
     ' last argument is not a proper list.</p>',
     'list<sub>1</sub> . obj<sub>n</sub>'),
   'apply': new Builtin('apply', function(args) {
     if (args.length == 0 || args.length > 2)
       throw IllegalArgumentCountError('apply', '', 'one or two', args.length);
     var proc = args[0];
     if (proc instanceof Builtin)
       proc = proc.apply;
     return proc(args[1]);
   }, 'Applies <em>proc</em> to elements of the list <em>args</em>.',
     'proc args'),
   'atom?': new Builtin('atom?', function(args) {
    if (args.length != 1)
      throw IllegalArgumentCountError('atom?', 'exactly', 1, args.length);
    return isAtom(first(args));
  },'<p>Returns #t if <em>obj</em> is an atom, and returns #f otherwise.</p>' +
    '<p>An <em>atom</em> is anything that is not a list. The empty list is ' +
    'not an atom.</p>', 'obj'),
  'begin': new Builtin('begin', function(e, env) {
    if (e.length == 1)
      return undefined;
    return meaning(cons(cons(Tokens.LAMBDA,
			     cons([], cdr(e))),
			[]), env);
  }, 'The expressions are evaluated from left to rigt, and the value of the ' +
    'last expression is returned.',
    'expression<sub>1</sub> . expression<sub>n</sub>'),
  'call-with-current-continuation':
    new Builtin('call-with-current-continuation', function(args) {
      if (args.length != 1) {
	throw IllegalArgumentCountError('call-with-current-continuation',
	  'exactly', 1, args.length);
      } else if (typeof args[0] != 'function') {
	throw IllegalArgumentTypeError('call-with-current-continuation',
	  args[0], 1);
      }
      try {
	return args[0]([function(a) {throw new CallCCEscape(a[0]);}]);
      } catch (cc) {
	if (cc instanceof CallCCEscape)
	  return cc.arg;
	throw cc;
      }
  }, '<p>Calls <em>proc</em> with the current continuation.</p>'+
    '<p>Note: the continuation may only be used to return control <em>out' +
      'wards</em> to the call-with-current-continuation expression; <em>in' +
      'ward</em> continuations are not supported.</p>', 'proc'),
  'car': new Builtin('car', function(args) {
    if (args.length != 1)
      throw IllegalArgumentCountError('car', 'exactly', 1, args.length);
    if (first(args) instanceof Pair)
      return first(args).car;
    if (isAtom(first(args)) || isNull(first(args)))
      throw IllegalArgumentTypeError('car', first(args), 1);
    if (first(first(args)) instanceof Pair)
      return first(first(args)).car;
    return car(first(args));
  }, '<p>Returns the contents of the car field of <em>pair</em>.</p>' +
    '<p>Note: it is an error to take the car of the empty list.</p>', 'pair'),
  'cdr': new Builtin('cdr', function(args) {
    if (args.length != 1)
      throw IllegalArgumentCountError('cdr', 'exactly', 1, args.length);
    if (first(args) instanceof Pair)
      return first(args).cdr;
    if (isAtom(first(args)) || isNull(first(args)))
      throw IllegalArgumentTypeError('cdr', first(args), 1);
    if (first(first(args)) instanceof Pair)
      return first(first(args)).cdr;
    return cdr(first(args));
  },'<p>Returns the contents of the cdr field of <em>pair</em>.</p>' +
    '<p>Note: it is an error to take the cdr of the empty list.</p>', 'pair'),
  'clear-console': new Builtin('clear-console', function(args) {
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
  'cond': new Builtin('cond', function(e, env) {
    return evcon(condLinesOf(e), env);
  },'<p>Each <em>clause</em> is a pair where the car is a <em>test</em> ' +
    'expression, and the cdr is the value of the cond expresion if the test ' +
    'evaluates to a true value.</p><p>The value of the first clause whose ' +
    'test is true is the value of the cond expression.</p>',
    'clause<sub>1</sub> clause<sub>2</sub> . clause<sub>n</sub>'),
  'cons': new Builtin('cons', function(args) {
    if (args.length != 2)
      throw IllegalArgumentCountError('cons', 'exactly', 2, args.length);
    if (isAtom(second(args)))
      return new Pair(first(args), second(args));
    return cons(first(args), second(args));
  }, 'Returns a newly allocated pair whose car is <em>obj<sub>1</sub></em> ' +
    'and whose cdr is <em>obj<sub>2</sub></em>.',
    'obj<sub>1</sub> obj<sub>2</sub>'),
  'cos': new Builtin('cos', function(args) {
    if (args.length != 1)
      throw IllegalArgumentCountError('cos', 'exactly', 1, args.length);
    if (!isNumber(args[0]))
      throw IllegalArgumentTypeError('cos', args[0], 1);
    return Math.cos(args[0]);
  }, 'Returns the cosine (in radians) of <em>number</em> using the JavaScript' +
    ' <strong>Math.cos()</strong> function.', 'number'),
  'define': new Builtin('define', function(e, env) {
    if (isAtom(second(e))) {
      var name = nameOf(e);
      if (!isIdentifier(name) || ReservedSymbolTable.get(name) != undefined)
	throw new Warning(name + ' may not be defined.');
      env.extend(nameOf(e), box(meaning(rightSideOf(e), env)));
      return nameOf(e);
    } else if (!isNull(second(e))) {
      var name = car(car(cdr(e)));
      if (!isIdentifier(name) || ReservedSymbolTable.get(name) != undefined)
	throw new Warning(name + ' may not be defined.');
      var rhs = cons(Tokens.LAMBDA,
		     cons(cdr(car(cdr(e))),
			  cdr(cdr(e))));
      env.extend(name, box(meaning(rhs, env)));
      return name;
    }
    throw "SyntaxError: I don't know what to do with that.";
  }, '<p>Defines a variable in the current environment that refers to the ' +
    'value of <em>expression</em>. The value of <em>expression</em> is not ' +
    'evaluated during the definition.  If no <em>expression</em> is present, ' +
    '0 will be used.</p><p>The alternative form of define may also be used to' +
    ' define procedures. This form is:</p><p>(define (proc [formals]) body)' +
    '<p></p>and is equivalent to</p><p>(define proc (lambda ([formals]) body))',
     'variable [expression]', 'variable [expression]'),
  'delay': new Builtin('delay', function(e, env) {
    if (e.length == 1)
      throw 'Ill-formed special form: ' + format(e);
    return new Promise(e[1], env);
  }, 'Returns a <em>promise</em> which at some point in the future may be ' +
    'asked (by the <strong>force</strong> procedure) to evaluate ' +
    '<em>expression</em>, and deliver the resulting value.', 'expression'),
  'display': new Builtin('display', function(args) {
    if (args.length != 1)
      throw IllegalArgumentCountError('display', 'exactly', 1, args.length);
    printDisplay(format(args[0]));
  }, 'Prints <em>obj</em>.', 'obj'),
  'display-built-ins': new Builtin('display-built-ins', function(args) {
    throw new Escape(printBuiltinsHelp, args);
  }, 'Displays the list of built-in procedures.'),
  'eval': new Builtin('eval', function(e, env) {
    if (e.length != 2)
      throw IllegalArgumentCountError('eval', 'exactly', 1, e.length - 1);
    var args = meaning(e[1], env);
    if (isAtom(args))
      return meaning(parser.parse(args), env);
    else if (!isNull(args))
      return meaning(args, env);
    throw IllegalArgumentTypeError('eval', args, 1);
  }, '<p>Evaluates <em>expression</em> in the current environment.</p><p>' +
    '<em>expression</em> can either be a string Scheme ' +
    'expression, or a quoted external representation of a Scheme expression.' +
    '</p><p>For example,</p><p>(eval \'(+ 2 2)) => 4<br />(eval "(+ 2 2)") =>' +
    ' 4</p>', 'expression'),
  'even?': new Builtin('even?', function(args) {
    if (args.length != 1)
      throw IllegalArgumentCountError('even?', 'exactly', 1, args.length);
    if (!isNumber(args[0]))
      throw IllegalArgumentTypeError('even?', args[0], 1);
    return first(args) % 2 == 0;
  }, 'Returns #t if <em>n</em> is even, and #f otherwise.', 'n'),
  'eq?': new Builtin('eq?', function(args) {
    if (args.length != 2)
      throw IllegalArgumentCountError('eq?', 'exactly', 2, args.length);
    return first(args) == second(args) || isNull(first(args)) &&
      isNull(second(args));
  }, '<p>Returns #t if <em>obj<sub>1</sub></em> is "equal" to ' +
    '<em>obj<sub>2</sub></em>.</p><p>This is currently determined using the' +
    ' JavaScript <strong>==</strong> operator.</p>',
    'obj<sub>1</sub> obj<sub>2</sub>'),
  'force': new Builtin('force', function(args) {
    if (args.length != 1)
      throw IllegalArgumentCountError('force', 'exactly', 1, args.length);
    if (!(args[0] instanceof Promise))
      throw IllegalArgumentTypeError('force', args[0], 1);
    return args[0].force();
  }, 'Forces the value of <em>promise</em>.  If no value has been ' +
    'computed for the promise, then that value is computed, memoized, and ' +
    'returned.', 'promise'),
  'for-each': new Builtin('for-each', function(args) {
    if (args.length < 2)
      throw IllegalArgumentCountError('for-each', 'at least', 2, args.length);
    var proc = car(args);
    var lists = cdr(args);
    for (var i = 1; i < lists.length; i++) {
      if (lists[i].length != lists[0].length)
	throw "IllegalArgumentError: all of the lists must be the same length";
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
      proc.apply(this, [pargs]);
    }
  }, '<p>Applies <em>proc</em> element-wise to the elements of the ' +
    '<em>list</em>s and returns a list of the results, in order.</p>' +
    '<p><em>Proc</em> must be a function of as many arguments as there are ' +
    'lists specified.</p>', 'proc list<sub>1</sub> . list<sub>n</sub>'),
  'help': new Builtin('help', function(args) {
    throw new Escape(printHelp, args);
  }, 'Displays help information for JS-SCHEME.'),
  'if': new Builtin('if', function(e, env) {
    return evif(cdr(e), env);
  }, 'An <strong>if</strong> expression ', 'test consequent [alternate]'),
  'lambda': new Builtin('lambda', function(e, env) {
    if (formalsOf(e).length != formalsOf(e).uniq().length)
      throw "Ill-formed special form: " + format(e);
    return function(args) {
      env = env.extension();
      if (formalsOf(e).length != args.length)
	throw IllegalArgumentCountError('#[compound-procedure]', 'exactly',
					formalsOf(e).length, args.length);
      env.multiExtend(formalsOf(e), boxAll(args));
      return beglis(bodyOf(e), env);
    };
  }, 'Evaluates to a procedure.  Currently, the formals <u>must</u> be in ' +
    'the form of a list. <p><br />((lambda (a) (+ a 1)) 2) ==> 3 ' +
    '; procedure that adds 1 to a</p>',
    '(formals) body'),
  'length': new Builtin('length', function(args) {
    if (args.length != 1)
      throw IllegalArgumentCountError('length', 'exactly', 1, args.length);
    if (!Object.isArray(args[0]))
      throw IllegalArgumentTypeError('length', args[0], 1);
    return args[0].length;
  }, 'Returns the length of <em>list</em>.', 'list'),
  'let': new Builtin('let', function(e, env) {
    return meaning(cons(cons(Tokens.LAMBDA,
                             cons(map(function(el) {
					return car(el);
				      }, car(cdr(e))),
				  (cdr(cdr(e))))),
			map(function(el) {
			      return (car(cdr(el)));
			    }, car(cdr(e)))), env);
  }, '<p><em>bindings</em> is a list of pairs where the form of the pair is: ' +
    '</p><p>(<em>variable</em> <em>init</em>)</p><p>Each <em>init</em> is ' +
    'evaluated in the current environment, in some unspecified order, and ' +
    'bound to the corresponding <em>variable</em>.</p>' +
    '<p><em>body</em> is a sequence of expressions to be evaluated; the ' +
    'value of the last expression is the value of the let expression.</p>' +
    '<p><em>body</em> is evaluated in an extended environment.</p>',
     'bindings body'),
  'let*': new Builtin('let*', function(e, env) {
    var help = function(e, b) {
      if (isNull(e)) {
	return [];
      } else if (e.length == 1) {
	return cons(cons(Tokens.LAMBDA,
			 cons(cons(car(car(e)),
				   []),
			      b)),
		    cons(car(cdr(car(e))),
			 []));
      } else {
	return cons(cons(Tokens.LAMBDA,
			 cons(cons(car(car(e)),
				   []),
			      cons(help(cdr(e), b),
			           []))),
		    cons(car(cdr(car(e))),
		         []));
      }
    };
    return meaning(help(car(cdr(e)), (cdr(cdr(e)))), env);
  }, '<p><em>bindings</em> is a list of pairs where the form of the pair is: ' +
    '</p><p>(<em>variable</em> <em>init</em>)</p><p>Each <em>init</em> is ' +
    'evaluated sequentially from left to right, where each binding to the ' +
    'left of the one being evaluated is visible to the one being evaluated, ' +
    'and bound to the corresponding <em>variable</em>.</p>' +
    '<p><em>body</em> is a sequence of expressions to be evaluated; the ' +
    'value of the last expression is the value of the let expression.</p>' +
    '<p><em>body</em> is evaluated in an extended environment.</p>',
     'bindings body'),
  'letrec': new Builtin('letrec', function(e, env) {
    var body = cdr(cdr(e));
    var col = function(li) {
      body = cons(cons(Tokens.DEFINE,
		       cons(car(li),
			    cdr(li))),
		  body);
    };
    map(col, car(cdr(e)));
    var lisp = cons(cons(Tokens.LAMBDA,
			 cons([], body)),
		    []);
    return meaning(lisp, env);
  }, '<p><em>bindings</em> is a list of pairs where the form of the pair is: ' +
    '</p><p>(<em>variable</em> <em>init</em>)</p><p>Each <em>init</em> is ' +
    'bound to the corresponding <em>variable</em>, in some unspecified ' +
    'order, where the region of each binding of a variable is the entire ' +
    'letrec expression.</p>' +
    '<p><em>body</em> is a sequence of expressions to be evaluated; the ' +
    'value of the last expression is the value of the let expression.</p>' +
    '<p><em>body</em> is evaluated in an extended environment.</p>',
     'bindings body'),
 'list': new Builtin('list', function(args) {
    return args;
  }, 'Returns a list made up of the arguments.',
    'obj<sub>1</sub> . obj<sub>n</sub>'),
  'list?': new Builtin('list?', function(args) {
    if (args.length != 1)
      throw IllegalArgumentCountError('list?', 'exactly', 1, args.length);
    if (isAtom(args[0]))
      return false;
    if (isNull(args[0]))
      return true;
    for (var i = 0; i < args[0].length; i++) {
      if (isAtom(args[0][i]) && (args[0][i] instanceof Pair) &&
	  !isNull(args[0][i].cdr))
	return false;
    }
    return true;
  }, 'Returns #t if <em>obj</em> is a list, and returns #f otherwise.', 'obj'),
  'map': new Builtin('map', function(args) {
    if (args.length < 2)
      throw IllegalArgumentCountError('map', 'at least', 2, args.length);
    var proc = car(args);
    var lists = cdr(args);
    for (var i = 1; i < lists.length; i++) {
      if (lists[i].length != lists[0].length)
	throw "IllegalArgumentError: all of the lists must be the same length";
    }
    var res = [];
    for (var i = 0; i < lists[0].length; i++) {
      var pargs = [];
      for (var j = 0; j < lists.length; j++) {
	pargs.push(lists[j][i]);
      }
      if (proc instanceof Builtin)
	proc = proc.apply;
      if (typeof proc != 'function')
	throw IllegalArgumentTypeError('map', proc, 1);
      res.push(proc.apply(this, [pargs]));
    }
    return res;
  }, '<p>Applies <em>proc</em> element-wise to the elements of the ' +
    '<em>list</em>s and returns a list of the results, in order.</p>' +
    '<p><em>Proc</em> must be a function of as many arguments as there are ' +
    'lists specified.</p>', 'proc list<sub>1</sub> . list<sub>n</sub>'),
  'not': new Builtin('not', function(args) {
    if (args.length != 1)
      throw IllegalArgumentCountError('not', 'exactly', 1, args.length);
    return car(args) == false;
  },'<p><em>not</em> returns #t if <em>obj</em> is false, and returns #f ' +
   'otherwise.</p><p>Note: <b>#f</b> is the <u>only</u> false value in ' +
   'conditional expressions.</p>', 'obj'),
  'null?': new Builtin('null?', function(args) {
    if (args.length != 1)
      throw IllegalArgumentCountError('null?', 'exactly', 1, args.length);
    return isNull(first(args));
  }, 'Returns #t if <em>obj</em> is the empty list, and returns #f otherwise.',
    'obj'),
  'number?': new Builtin('number?', function(args) {
    if (args.length != 1)
      throw IllegalArgumentCountError('number?', 'exactly', 1, args.length);
    return isNumber(first(args));
  }, 'Returns #t if <em>obj</em> is a number, and returns #f otherwise.',
    'obj'),
  'odd?': new Builtin('odd?', function(args) {
    if (args.length != 1)
      throw IllegalArgumentCountError('odd?', 'exactly', 1, args.length);
    if (!isNumber(args[0]))
      throw IllegalArgumentTypeError('odd?', args[0], 1);
    return first(args) % 2 != 0;
  }, 'Returns #t if <em>n</em> is odd, and returns #f otherwise.', 'n'),
  'or': new Builtin('or', function(args) {
    for (var i = 0; i < args.length; i++)
      if (args[i])
	return args[i];
    return false;
  },'<p>The logical <em>or</em> returns the first element in its argument ' +
   'list that doesn\'t evaluate to #f.  Otherwise, returns #f.</p>' +
   '<p>Note: <b>#f</b> is the <u>only</u> false value in conditional ' +
   'expressions.</p>', 'obj<sub>1</sub> . obj<sub>n</sub>'),
  'pair?': new Builtin('pair?', function(args) {
    if (args.length != 1)
      throw IllegalArgumentCountError('pair?', 'exactly', 1, args.length);
    return !isNull(args[0]) && !isAtom(args[0]);
  }, 'Returns #t if <em>obj</em> is a pair, and returns #f otherwise.', 'obj'),
  'pow': new Builtin('pow', function(args) {
    if (args.length != 2)
      throw IllegalArgumentCountError('pow', 'exactly', 1, args.length);
    if (!isNumber(args[0]))
      throw IllegalArgumentTypeError('pow', args[0], 1);
    if (!isNumber(args[1]))
      throw IllegalArgumentTypeError('pow', args[1], 2);
    return Math.pow(args[0], args[1]);
  }, 'Returns <em>a</em> to the power of <em>b</em>.', 'a b'),
  'quote': new Builtin('quote', function(e, env) {
    return function(args) {
      if (args.length != 1)
	throw IllegalArgumentCountError('quote', 'exactly', 1, args.length);
      return first(args);
    }(cdr(e));
  }, '<p>Evaluates to <em>datum</em>.</p><p>The single-quote character ' +
    '<strong>\'</strong> may also be used as an abbreviation, where ' +
    '<strong>\'<em>datum</em></strong> is equivalent to <strong>(quote <em>' +
    'datum</em></strong>)</p>', 'datum'),
  'reverse': new Builtin('reverse', function(args) {
    if (args.length != 1)
      throw IllegalArgumentCountError('reverse', 'exactly', 1, args.length);
    if (!Object.isArray(args[0]))
      throw IllegalArgumentTypeError('reverse', args[0], 1);
    return args[0].reverse(false);
  }, 'Returns a newly allocated list containing the elements of ' +
    '<em>list</em> in reverse order.', 'list'),
  'set!': new Builtin('set!', function(e, env) {
    var oldBox = env.lookup(nameOf(e));
    var old = unbox(oldBox);
    setbox(oldBox, meaning(rightSideOf(e), env));
    return old;
  }, 'Similar to <strong>define</strong>, except that <em>variable</em> must ' +
    'already be in the environment. If no <em>expression</em> is present, ' +
    '0 is used. Returns the original value that <em>variable</em> referred to.',
    'variable [expression]'),
  'sin': new Builtin('sin', function(args) {
    if (args.length != 1)
      throw IllegalArgumentCountError('sin', 'exactly', 1, args.length);
    if (!isNumber(args[0]))
      throw IllegalArgumentTypeError('sin', args[0], 1);
    return Math.cos(args[0]);
  }, 'Returns the sine (in radians) of <em>number</em> using the JavaScript ' +
    '<strong>Math.sin()</strong> function.', 'number'),
  'tan': new Builtin('tan', function(args) {
    if (args.length != 1)
      throw IllegalArgumentCountError('tan', 'exactly', 1, args.length);
    if (!isNumber(args[0]))
      throw IllegalArgumentTypeError('tan', args[0], 1);
    return Math.tan(args[0]);
  }, 'Returns the tangent (in radians) of <em>number</em> using the ' +
    'JavaScript <strong>Math.tan()</strong> function.', 'number'),
  'zero?': new Builtin('zero?', function(args) {
    if (args.length != 1)
      throw IllegalArgumentCountError('zero?', 'exactly', 1, args.length);
    if (!isNumber(first(args)))
      throw IllegalArgumentTypeError('zero?', args[0], 1);
    return first(args) === 0;
  }, 'Returns #t if <em>number</em> is 0, and returns #f otherwise.', 'number'),
  '=': new Builtin('=', function(args) {
    return mapCmp(function(lhs, rhs) { return lhs != rhs; }, args);
  }, 'Returns #t if every argument is "equal," and returns #f otherwise. ' +
    'Equality is determined using the JavaScript <strong>==</strong> operator.',
    'obj<sub>1</sub> . obj<sub>n</sub>'),
  '<': new Builtin('<', function(args) {
    return mapCmp(function(lhs, rhs) { return lhs >= rhs; }, args);
  }, 'Returns #t if the first argument is less than every other argument, and' +
    ' returns #f otherwise.', 'number<sub>1</sub> . number<sub>n</sub>'),
  '>': new Builtin('>', function(args) {
    return mapCmp(function(lhs, rhs) { return lhs <= rhs; }, args);
  }, 'Returns #t if the first argument is greater than every other argument, ' +
    'and returns #f otherwise.', 'number<sub>1</sub> . number<sub>n</sub>'),
  '<=': new Builtin('<=', function(args) {
    return mapCmp(function(lhs, rhs) { return lhs > rhs; }, args);
  }, 'Returns #t if the first argument is less than or equal to every other ' +
    'argument, and returns #f otherwise.', 'number<sub>1</sub> . number<sub>' +
    'n</sub>'),
  '>=': new Builtin('>=', function(args) {
    return mapCmp(function(lhs, rhs) { return lhs < rhs; }, args);
  }, 'Returns #t if the first argument is greater than or equal to every ' +
    'other argument, and returns #f otherwise.',
    'number<sub>1</sub> . number<sub>n</sub>'),
  '+': new Builtin('+', function(args) {
    return mapOp(function(lhs, rhs) { return lhs + rhs; }, 0, args, '+');
  }, 'Returns the sum of the arguments.',
    'number<sub>1</sub> . number<sub>n</sub>'),
  '-': new Builtin('-', function(args) {
    if (args.length == 0)
      throw IllegalArgumentCountError('-', 'at least', 2, args.length);
    if (args.length == 1 && isNumber(car(args)))
      return car(args) * -1;
    else if (args.length == 1)
      throw IllegalArgumentTypeError('-', car(args), 1);
    var ans = car(args);
    if (!isNumber(ans))
      throw IllegalArgumentTypeError('-', ans, 1);
    for (var i = 1; i < args.length; i++) {
      if (!isNumber(args[i]))
	throw IllegalArgumentTypeError('-' ,args[i], i+1);
      ans -= args[i];
    }
    return ans;
  }, 'With two or more arguments, returns the difference of the arguments. ' +
    'With one argument, returns the additive inverse of the argument.',
    'number<sub>1</sub> . number<sub>n</sub>'),
  '*': new Builtin('*', function(args) {
    return mapOp(function(lhs, rhs) { return lhs * rhs; }, 1, args, '*');
  }, 'Returns the product of the arguments.  With one argument, returns that ' +
    'argument multiplied by 1.  With no arguments, returns 1.',
    'number<sub>1</sub> . number<sub>n</sub>'),
  '/': new Builtin('/', function(args) {
    if (args.length == 0)
      throw IllegalArgumentCountError('/', 'at least', 1, args.length);
    if (args.length == 1)
      return 1 / args[0];
    return mapOp(function(lhs, rhs) { return lhs / rhs; }, args[0], cdr(args),
      '/');
  }, 'Returns the quotient of the arguments. With one argument, returns the ' +
    'multiplicative inverse of the argument.',
    'number<sub>1</sub> . number<sub>n</sub>')
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
  force: function() {
    if (!this.hasForced) {
      this.promise = meaning(this.promise, this.env);
      this.hasForced = true;
    }
    return this.promise;
  },
  toString: function() {
    return '#[promise ' + this.id + ']';
  }
});

var Warning = Class.create({
  initialize: function(message, type, ignore) {
    this.message = message;
    this.type = type == undefined ? '' : type;
    this.ignore = ignore;
  },
  toString: function() {
    return this.type + 'Warning: ' + this.message;
  }
});
var ParseWarning = Class.create(Warning, {
  initialize: function($super, message, ignore) {
    $super(message, 'Parse', ignore);
  }
});
var IllegalArgumentError = Class.create({
  initialize: function(message) {
    this.message = message;
  },
  toString: function() {
    return 'IllegalArgumentError: ' + this.message;
  }
});
var IllegalArgumentCountError = function(func, how, req, cnt) {
  return new IllegalArgumentError('The procedure ' + func + ' has been called' +
    ' with ' + cnt + ' argument' + (cnt == 1 ? ';' : 's;') + ' it requires ' +
      how + ' ' +  req + ' argument' + (req == 1 ? '.' : 's.'));
};
var IllegalArgumentTypeError = function(func, arg, cnt) {
  return new IllegalArgumentError('The object ' + format(arg) + ', passed as ' +
    'argument ' + cnt + ' to ' + func + ', is not the correct type.');
};

var map = function(op, args) {
  var res = [];
  for (var i = 0; i < args.length; i++)
    res.push(op(args[i]));
  return res;
};
var mapCmp = function(op, args) {
  for (var i = 1; i < args.length; i++)
    if (op(car(args), args[i]))
      return false;
  return true;
};
var mapOp = function(op, initial, args, func) {
  var ans = getNumber(initial);
  if (!isNumber(ans))
    throw IllegalArgumentTypeError(func, ans, 1);
  for (var i = 0; i < args.length; i++) {
    if (!isNumber(args[i]))
      throw IllegalArgumentTypeError(func, args[i], i+1);
    ans = op(ans, getNumber(args[i]));
  }
  return ans;
};

var JSString = Class.create({
  initialize: function(string) {
    this.string = string;
  },
  toString: function() {
    return this.string;
  }
});

var createMatcher = function(regex) {
  return function(e) { return new RegExp(regex).test(e); };
};
var _isIdentifier = createMatcher(Tokens.IDENTIFIER);
var isIdentifier = function(e) {
  return !isNumber(e) && !isString(e) && _isIdentifier(e);
};
var isNumber = createMatcher(Tokens.NUMBER);
var isDecimal = createMatcher(Numbers.DECIMAL);
var isBinary = createMatcher(Numbers.BINARY);
var isHex = createMatcher(Numbers.HEX);
var isOctal = createMatcher(Numbers.OCTAL);
var getNumber = function(number) {
  number = number.toString();
  if (isDecimal(number) && number.indexOf('.') != -1) {
    return parseFloat(number.replace('#d',''));
  } else if (isDecimal(number)) {
    return parseInt(number.replace('#d',''));
  } else if (isBinary(number)) {
    var res = 0, pow = 0;
    for (var i = number.length - 1; i > 1; i--)
      res += parseInt(number[i]) * Math.pow(2, number.length - i - 1);
    return res;
  } else if (isHex(number)) {
    return parseInt(number.replace('#','0'), 16);
  } else if (isOctal(number)) {
    return parseInt(number.replace('#o',''), 8);
  } else {
    throw new TypeError(number + " is not a number.");
  }
};
var isString = createMatcher(Tokens.STRING);
var getString = function(expr) {
  if (isString(expr))
    return new JSString(new RegExp(Tokens.STRING).exec(expr)[1]);
  throw new TypeError(expr + " is not a string.");
};

var isAtom = function(x) { return !Object.isArray(x); };
var isNull = function(x) { return Object.isArray(x) && x.length == 0; };
var car = function(list) { return list[0]; };
var cdr = function(list) {
  var tmp = list.clone();
  tmp.shift();
  return tmp;
};
var cons = function(x, list) {
  var tmp = list.clone();
  tmp.unshift(x);
  return tmp;
};
var isElse = function(x) {
  if (isAtom(x)) return x == Tokens.ELSE;
  return false;
};
var first = car;
var second = function(list) { return car(cdr(list)); };
var third = function(list) { return car(cdr(cdr(list))); };
var functionOf = first;
var argumentsOf = cdr;
var questionOf = first;
var answerOf = second;
var tableOf = first;
var formalsOf = second;
var bodyOf = function(list) {
  return cdr(cdr(list));
};
var nameOf = second;
var condLinesOf = cdr;
var rightSideOf = function(list) {
  if (isNull(cdr(cdr(list))))
    return 0;
  return third(list);
};

var format = function(str) {
  if (typeof str == 'function')
    return '#<procedure>';
  if (str === true)
    return '#t';
  if (str === false)
    return '#f';
  if ((str instanceof Promise) || (str instanceof CallCCEscape))
    return str.toString();
  if (str instanceof JSString)
    return '"' + str + '"';
  if (Object.isArray(str) && str[0] instanceof Pair) {
    var str2 = str.clone();
    for (var i = 0; i < str2.length; i++) {
      str2[i] = str2[i].toString();
    }
    return Object.inspect(str2).gsub('[\\[]', '(').gsub(']',')').gsub(',','')
      .gsub('\'','');
  }
  return Object.inspect(str).gsub('[\\[]','(').gsub(']',')').gsub(',','')
    .gsub('\'','');
};

var Lexer = Class.create({
  tokenize: function(expr) {
    var tokens = [];
    var open = 0;
    for (var i = 0; i < expr.length; i++) {
      if (expr[i] != Tokens.SPACE && expr[i] != Tokens.NEWLINE) {
	var token = this.nextToken(expr.substring(i));
	i += token.length - 1;
	if (token.length != 0) {
	  if (token == Tokens.L_PAREN) open++;
	  if (token == Tokens.R_PAREN) open--;
	  if (token[0] != Tokens.SEMI_COLON)
	    tokens.push(token);
	}
      }
    }
    if (open < 0) {
      throw new ParseWarning("unbalanced parens");
    } else if (open > 0) {
      throw new ParseWarning("unbalanced parens", true);
    } else {
      return tokens;
    }
  },
  nextToken: function(expr) {
    if (expr[0] == Tokens.L_PAREN || expr[0] == Tokens.R_PAREN ||
	expr[0] == Tokens.SINGLE_QUOTE) {
      return expr[0];
    } else if (isString(expr)) {
      return '"' + getString(expr) + '"';
    } else if (expr[0] == Tokens.SEMI_COLON) {
      var comment = '';
      for (var i = 0; i < expr.length; i++) {
	if (expr[i] == Tokens.NEWLINE)
	  break;
	comment += expr[i];
      }
      return comment;
    } else {
      var sexpr = '';
      for (var i = 0; i < expr.length; i++) {
	if (expr[i] == Tokens.L_PAREN || expr[i] == Tokens.R_PAREN ||
	    expr[i] == Tokens.SPACE || expr[i] == Tokens.NEWLINE)
	  break;
	sexpr += expr[i];
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
    while (!isNull(tokens)) {
      stack.push(this.nextSExpr(tokens));
    }
    if (stack.length == 0)
      throw new ParseWarning("empty", true);
    return stack.pop();
  },
  nextSExpr: function(tokens) {
    if (isNull(tokens)) {
      return [];
    } else if (car(tokens) == Tokens.L_PAREN) {
      tokens.shift();
      return this.nextList(tokens);
    } else if (car(tokens) == Tokens.SINGLE_QUOTE) {
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
      throw new ParseWarning("Ill-formed dotted list; car is undefined.");
    }
    var pair = new Pair(undefined, undefined, false);
    while (!isNull(tokens) && next != Tokens.R_PAREN) {
      if (next != Tokens.DOT)
	list.push(next);
      var pp = (next instanceof Pair);
      next = this.nextSExpr(tokens);
      if (pp && next != Tokens.R_PAREN) {
	/* if the previous s-expression was a pair, it must either be nested
	 * with parens or be the last s-expression in the list
	 */
	throw new ParseWarning("Ill-formed dotted list.");
      }
      if (next == Tokens.DOT) {
	if (pair.isEmpty()) {
	  pair.car = list.pop();
	  if (pair.car === undefined) {
	    throw new ParseWarning("Ill-formed dotted list; car is undefined.");
	  } else if (pair.car instanceof Pair) {
	    throw new ParseWarning("Ill-formed dotted list; car is a Pair.");
	  }
	} else {
	  throw new ParseWarning("Ill-formed dotted list.");
	}
      } else if (pair.car && pair.cdr === undefined) {
	pair.cdr = next;
	if (pair.cdr === undefined) {
	  throw new ParseWarning("Ill-formed dotted list; cdr is undefined.");
	}
	next = pair;
      } else if (!pair.isEmpty() && next != Tokens.R_PAREN) {
	throw new ParseWarning("Ill-formed dotted list.");
      }
    }
    return list;
  }
});

function printError(error) {
  printBlock(';' + error, 'error');
}

function printWarning(warning) {
  printBlock(';' + warning, 'warning');
}

function printValue(value) {
  printBlock(';Value: ' + value, 'value');
}

function printBlock(text, className) {
  var span = document.createElement('span');
  span.addClassName(className);
  span.addClassName('block');
  span.appendChild(document.createTextNode(text));
  print(span);
}

var ejbuff = [];
function printDisplay(text) {
  var span = document.createElement('span');
  span.addClassName('block');
  span.appendChild(document.createTextNode(text));
  ejbuff.push(span);
}

function printContinue() {
  ejprefix = CONTINUE_PREFIX;
  print(undefined, ejecnt == 1 ? DEFAULT_PREFIX : ejprefix);
  $(Document.PREFIX).update(ejprefix);
}

function print(element, prefix) {
  if (prefix === undefined) prefix = ejprefix;
  var div = document.createElement('div');
  var pre = document.createElement('span');
  pre.update(prefix);
  var expr = document.createElement('pre');
  expr.addClassName(Document.INPUT);
  expr.appendChild(document.createTextNode($F(Document.INPUT)));
  var line = document.createElement('span');
  line.addClassName('line');
  line.appendChild(pre);
  line.appendChild(expr);
  div.appendChild(line);
  for (var i = 0; i < ejbuff.length; i++) {
    div.appendChild(ejbuff[i]);
  }
  ejbuff = [];
  if (element)
    div.appendChild(element);
  $(Document.CONSOLE).appendChild(div);
  $(Document.INPUT).value = '';
  $(Document.INPUT).focus();
  $(Document.PREFIX).update(DEFAULT_PREFIX);
  window.scrollTo(0, document.body.scrollHeight);
}

var helpc = 0;
function printHelp(args) {
  print();
  helpc++;
  var div = document.createElement('div');
  div.addClassName('help');
  if (args.length == 0)
    div.update(getHelp());
  else if (args.length == 1 && args[0].doc)
    div.update(getBuiltinHelp(args[0]));
  $(Document.CONSOLE).appendChild(div);
  window.scrollTo(0, document.body.scrollHeight);
}

function printBuiltinsHelp() {
  print();
  helpc++;
  var div = document.createElement('div');
  div.addClassName('help');
  div.update(getBuiltinsHTML());
  $(Document.CONSOLE).appendChild(div);
  window.scrollTo(0, document.body.scrollHeight);
}

function getHelpList(keys, ITEMS_PER_COL, test) {
  if (test === undefined)
    test = function(arg) { return true; };
  var tab = 0;
  var open = true;
  var list = '<ul>';
  for (var i = 0; i < keys.length; i++) {
    if (test(keys[i])) {
      tab++;
      if (!open)
	list += '<ul>';
      open = true;
      list += '<li>' + keys[i] + '</li>';
      if (tab > ITEMS_PER_COL - 1 && tab % ITEMS_PER_COL == 0) {
	open = false;
	list += '</ul>';
      }
    }
  }
  list += (open ? '</ul>' : '');
  return list;
}

function getBuiltinsHTML() {
  var ITEMS_PER_COL = 30;
  var keys = ReservedSymbolTable.keys();
  var isBuiltin = function(key) {
    return ReservedSymbolTable.get(key) instanceof Builtin;
  };
  return '<h1><span>BUILTIN-PROCEDURES</span>' +
    getToggleLinkFor('builtinList', 'helpMin') + '</h1><div class="helpBody">' +
    '<div class="builtinList" id="builtinList' + helpc + '">' +
    '<div>' + getHelpList(keys, ITEMS_PER_COL, isBuiltin) + '</div></div>' +
    '<div style="clear:both;"></div></div>';
}

function getHelp() {
  var builtins = '<h2><span>BUILT-IN PROCEDURES</span></h2>' +
    '<div class="builtinList" id="builtinList' + helpc + '">' +
    '<p>' +
      'To view documentation for a built-in procedure, use ' +
      '<strong>(help <em>proc</em>)</strong> where ' +
      '<strong><em>proc</em></strong> is the procedure to lookup.' +
    '</p>' +
    '<p>' +
      'Enter <strong>(display-built-ins)</strong> to view a list of the ' +
      '<strong>' + ReservedSymbolTable.keys().length + '</strong> ' +
      'built-ins.' +
    '</p>';
  return '<h1><span>JS-SCHEME HELP</span> ' +
    getToggleLinkFor('helpBody','helpMin') + '</h1><div class="helpBody">' +
    '<div id="helpBody' + helpc + '">' +
    '<p>Welcome to JS-SCHEME ' + JSScheme.version + '!</p>' +
    '<p>' +
      'This interpreter began as an extension of the one ' +
      'described in the final chapter of ' +
      '<a href="http://www.amazon.com/Seasoned-Schemer-Daniel-P-Friedman/dp/' +
	     '026256100X">The Seasoned Schemer</a>.' +
    '</p>' +
    '<p>' +
      'JS-SCHEME is written by <a href="http://www.eriksilkensen.com">Erik ' +
      'Silkensen</a>.' +
    '</p>' +
    '<p>' +
      'Visit the <a href="http://js-scheme.googlecode.com">Google Code</a> ' +
      'page for more information.' +
    '</p>' +
    builtins +
    '</div></div>';
};

function getBuiltinHelp(proc) {
  return '<h1><span>JS-SCHEME HELP</span> ' +
    '<span class="syntax"><strong>(' + proc.name +
    '</strong>' + (proc.argdoc ? ' <em>' + proc.argdoc + '</em>' : '') +
    '<strong>)</strong></span>' +
    getToggleLinkFor('helpBody', 'helpMin') + '</h1><div class="helpBody">' +
    '<div id="helpBody' + helpc + '">' + proc.doc + '</div></div>';
};

function getToggleLinkFor(what, cssClass, text) {
  if (text == undefined) text = '[toggle]';
  cssClass = cssClass ? (' class="' + cssClass + '" ') : '';
  return '<a href="#" onclick="$(\'' + what + helpc + '\').toggle();' +
    'return false;"' + cssClass + '>' + text + '</a>';
}

var ejexpr = '';
var ejecnt = 0;
var DEFAULT_PREFIX = '&gt;&nbsp;';
var CONTINUE_PREFIX = '<span class="continue">..&nbsp;</span>';
var ejprefix = DEFAULT_PREFIX;

var ejhist = [];
var ejhisttmp = '';
var ejhistprg = false;
var ejhistid = 0;
var ejhistmax = 100;

function onInputKeyDown(e) {
  if (Prototype.Browser.IE)
    return;
  var code =  e.keyCode ? e.keyCode : e.which ? e.which : undefined;
  if (code == undefined) return;
  if (code == Document.KEY_DOWN && ejhistid > 0) {
    if (ejhistid >= ejhist.length)
      ejhistid = ejhist.length - 1;
    $(Document.INPUT).value = ejhistid > 0 ? ejhist[--ejhistid] : ejhisttmp;
  } else if (code == Document.KEY_UP && ejhistid < ejhist.length) {
    if (!ejhistprg)
      ejhisttmp = $F(Document.INPUT);
    ejhistprg = true;
    if (ejhistid < 0)
      ejhistid = 0;
    $(Document.INPUT).value = ejhist[ejhistid++];
  } else if (code == Document.KEY_DOWN) {
    $(Document.INPUT).value = ejhisttmp;
    ejhistid = 0;
  } else if (code != Document.KEY_UP) {
    ejhistprg = false;
  }
}

var parser = new Parser();
function repl() {
  try {
    if (ejexpr == '' && $F(Document.INPUT).strip() == '') {
      print();
      return false;
    }
    ejecnt++;
    ejhistid = 0;
    while (ejhist.length >= ejhistmax - 1)
      ejhist.pop();
    ejhist.unshift($F(Document.INPUT));
    ejhisttmp = '';
    ejhistprg = false;
    ejexpr += Tokens.NEWLINE + $F(Document.INPUT);
    var ejval = value(parser.parse(ejexpr));
    printValue(format(ejval), ejecnt > 1 ? CONTINUE_PREFIX : undefined);
    ejecnt = 0;
    ejexpr = '';
    ejprefix = DEFAULT_PREFIX;
  } catch (e) {
    if (e instanceof Escape) {
      e.invoke();
    } else if (e instanceof ParseWarning && e.ignore) {
      printContinue();
      return false;
    }
    ejecnt = 0;
    ejexpr = '';
    ejprefix = DEFAULT_PREFIX;
    if (e instanceof Warning) {
      if (!e.ignore) {
	printWarning(e);
      }
    } else if (!(e instanceof Escape)) {
      printError(e);
    }
  }
  return false;
}

window.onload = function() {
  $(Document.INPUT).focus();
  $(Document.INPUT).onkeydown = onInputKeyDown;
};
