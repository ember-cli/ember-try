var CoreObject   = require('core-object');
var RSVP         = require('rsvp');
var mapSeries    = require('promise-map-series');
var BowerAdapter = require('./bower-adapter');
var NpmAdapter   = require('./npm-adapter');

module.exports = CoreObject.extend({
  init: function() {
    this._super.apply(this, arguments);
    this._initDependencyManagerAdapters();
  },

  _initDependencyManagerAdapters: function() {
    if (this.dependencyManagerAdapters && this.dependencyManagerAdapters.length > 0) { return; }
    var hasNpm = false;
    var hasBower = false;
    this.config.scenarios.forEach(function(scenario) {
      if (scenario.npm) {
        hasNpm = true;
      }
      if (scenario.bower || scenario.dependencies || scenario.devDependencies) {
        hasBower = true;
      }
    });
    this.dependencyManagerAdapters = [];
    if (hasNpm) {
      this.dependencyManagerAdapters.push(new NpmAdapter({cwd: this.project.root}));
    }
    if (hasBower) {
      this.dependencyManagerAdapters.push(new BowerAdapter({cwd: this.project.root}));
    }
    if (this.dependencyManagerAdapters.length === 0) {
      throw new Error('No dependency manager adapter created');
    }
  },

  setup: function() {
    return mapSeries(this.dependencyManagerAdapters, function(depManager) {
      return depManager.setup();
    });
  },

  changeTo: function(scenario) {
    var manager = this;
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

