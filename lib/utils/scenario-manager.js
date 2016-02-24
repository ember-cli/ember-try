'use strict';

var CoreObject   = require('core-object');
var RSVP         = require('rsvp');
var mapSeries    = require('promise-map-series');

module.exports = CoreObject.extend({
  init: function() {
    this._super.apply(this, arguments);
    this._checkDependencyManagerAdapters();
  },

  _checkDependencyManagerAdapters: function() {
    if (!this.dependencyManagerAdapters || this.dependencyManagerAdapters.length === 0) {
      throw new Error('No dependency manager adapter');
    }
  },

  setup: function() {
    return mapSeries(this.dependencyManagerAdapters, function(depManager) {
      return depManager.setup();
    });
  },

  changeTo: function(scenario) {
    return mapSeries(this.dependencyManagerAdapters, function(depManager) {
      return depManager.changeToDependencySet(scenario);
    }).then(function(results) {
      return RSVP.resolve([].concat.apply([], results));
    });
  },

  cleanup: function() {
    return mapSeries(this.dependencyManagerAdapters, function(depManager) {
      return depManager.cleanup();
    });
  }
});

