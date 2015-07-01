'use strict';
var CoreObject      = require('core-object');
var BowerHelpers    = require('../utils/bower-helpers');
var TestemHelpers   = require('../utils/testem-helpers');
var RSVP            = require('rsvp');

module.exports = CoreObject.extend({
  run: function(){
    return RSVP.all([BowerHelpers.cleanup(this.project.root),
      TestemHelpers.cleanup(this.project.root)]);
  }
});
