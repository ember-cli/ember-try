'use strict';

let CoreObject = require('core-object');
let RSVP = require('rsvp');

module.exports = CoreObject.extend({
  setup() {
    return RSVP.resolve();
  },
  changeToDependencySet() {
    return RSVP.resolve([{
      name: 'testDep',
      versionExpected: '2.0.0',
      versionSeen: '2.1.0',
    }]);
  },
  cleanup() {
    return RSVP.resolve();
  },
});
