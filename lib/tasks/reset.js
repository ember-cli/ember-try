'use strict';
var CoreObject      = require('core-object');
var ScenarioManager = require('../utils/scenario-manager');

module.exports = CoreObject.extend({
  run: function() {
    return new ScenarioManager({project: this.project, config: this.config}).cleanup();
  }
});
