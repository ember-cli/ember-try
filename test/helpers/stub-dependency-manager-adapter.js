'use strict';

var CoreObject    = require('core-object');
var RSVP          = require('rsvp');

module.exports = CoreObject.extend({
  setup: function() {
    return RSVP.resolve();
  },
  changeToDependencySet: function() {
    return RSVP.resolve([{
      name: 'testDep',
      versionExpected: '2.0.0',
      versionSeen: '2.1.0'
    }]);
  },
  cleanup: function() {
    return RSVP.resolve();
  }
});
