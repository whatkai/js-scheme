js-scheme is a Scheme interpreter written in JavaScript.

The Featured Download is updated every other week or so.  New revisions will be added in between each release; see the Source tab for the latest code.

There are two versions of js-scheme.  They are identical for the most part - except for that the one tagged _CPS_ supports first-class continuations, while the other only supports continuations as exit procedures.  As of version 0.4, no further development is planned for the _CPS_ version.

## Libraries ##

Starting in version 0.4 two extensions are packaged with the main download: a primitive API wrapper for Last.fm Web Services, and an interface to the flot JavaScript graphing library.

The **load** procedure can be used to load a library.  For example, `(load 'last.fm)` and `(load 'flot)`.  After loading, information about a library can be displayed using the **help** procedure.  For example, `(help 'last.fm)` and `(help 'flot)`.  The help message will usually display a list of procedures included with the library.

The convention so far has been for each library to prefix its procedures with its name and a colon mark.  For example, `last.fm:User.getRecentTracks` and `flot:plotf`.

### Library API ###

Ideally writing a custom library plugin for js-scheme is very easy.  A "library" is defined as an extension of the JSCMLib class.  The constructor of the library should call `$super` with the string that it can be loaded with via the **load** procedure.   Library classes should also define `name`, `procedures`, and `doc` fields.  `name` is a string name to display in the help message heading, `procedures` is a Hash of the Builtin library procedures, and `doc` is an HTML string to display as the help message body.  For example:

```
var FooBarLib = Class.create(JSCMLib, {
  initialize: function($super) {
    $super('foo-bar');
    this.name = 'FOO BAR LIBRARY';
    this.procedures = new Hash({
      'foo-bar:baz': new Builtin('baz', function(args) { 
        /* do baz */
      }.bind(this), 'This is the baz procedure documentation.', 'arg1 arg2')
    });
    this.doc = '<p>Welcome to the Foo Bar Library!</p>';
  }
}

jscm_registerLib('foo-bar', FooBarLib);
```

The final step is to call `jscm_registerLib` with the string loading name again, and the extended library class.

All of the js-scheme classes and procedures are of course available by default to libraries.  (More documentation will be provided later in the wiki).
