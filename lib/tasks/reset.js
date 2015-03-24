'use strict';
var Task            = require('ember-cli/lib/models/task');
var BowerHelpers    = require('../utils/bower-helpers');

module.exports = Task.extend({
  run: function(){
    return BowerHelpers.cleanup(this.project.root);
  }
});
