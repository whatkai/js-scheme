/*******************************************************************************
 LAST.FM LIBRARY - JS-SCHEME - a Scheme interpreter written in JavaScript
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
var LastFMLib = Class.create(JSCMLib, {
  initialize: function($super) {
    $super('last.fm');
    this.name = 'LAST.FM LIBRARY';
    this.doc = 'Welcome to the <strong>Last.fm Web Services</strong> library ' +
      'for js-scheme!';
    this.procedures = new Hash({
      'last.fm:Tasteometer.compare':
	new Builtin('Tasteometer.compare', function(args) {
	  if (args.length != 2) {
	    throw IllegalArgumentCountError('Tasteometer.compare', 'exactly',
					    2, args.length);
	  } else {
	    var response = undefined;
	    new Ajax.Request(LastFMLib.APIURL, {
	      asynchronous: false,
	      method: 'get',
	      contentType: 'text/xml',
	      parameters: {
		method: 'tasteometer.compare',
		type1: 'user',
		type2: 'user',
		value1: args[0],
		value2: args[1],
		api_key: LastFMLib.APIKEY
	      },
	      onSuccess: function(transport) {
		response = transport.responseXML;
	      }
	    });
	    var score = response.getElementsByTagName('score')[0].childNodes[0].nodeValue;
	    return score;
	  }
	}, 'TODO', 'user<sub>1</sub> user<sub>2</sub>'),
      'last.fm:User.getRecentTracks':
	new Builtin('User.getRecentTracks', function(args) {
	  var response = undefined;
	  var params = {
	    method: 'user.getrecenttracks',
	    user: args[0],
	    api_key: LastFMLib.APIKEY
	  };
	  if (args.length == 2 && Util.isNumber(args[1])) {
	    params.limit = args[1];
	  } else if (args.length == 2) {
	    throw IllegalArgumentTypeError('User.getRecentTracks', args[1], 2);
	  }
	  new Ajax.Request(LastFMLib.APIURL, {
	    asynchronous: false,
	    method: 'get',
	    contentType: 'text/xml',
	    parameters: params,
	    onException: function(request, e) {
	      throw e;
	    },
	    onSuccess: function(transport) {
	      response = transport.responseXML;
	    }
	  });
	  var tracks = response.getElementsByTagName('track');
	  var result = [];
	  for (var i = 0; i < tracks.length; i++) {
	    var track = tracks[i];
	    var artist = track.getElementsByTagName('artist')[0].childNodes[0].nodeValue;
	    var name = track.getElementsByTagName('name')[0].childNodes[0].nodeValue;
	    result.push([name, artist]);
	  }
	  return result;
	}, 'TODO', 'user [limit]')
    });
  },
  getProcedures: function() {
    return this.procedures;
  },
  toString: function() {
    return '#<lib-last.fm>';
  }
});

LastFMLib.APIKEY = '21135fc7b6dd9df15fac2b2a4be1e2a0';
LastFMLib.APIURL = 'libs/last.fm.php';

jscm_registerLib('last.fm', LastFMLib);

