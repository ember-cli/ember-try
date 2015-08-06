'use strict';
var CoreObject      = require('core-object');
var BowerHelpers    = require('../utils/bower-helpers');
var NpmHelpers    	= require('../utils/npm-helpers');
var RSVP			= require('rsvp');

module.exports = CoreObject.extend({
  run: function(){
    return RSVP.all([
    	BowerHelpers.cleanup(this.project.root),
    	NpmHelpers.cleanup(this.project.root)
    ]);
  }
});
