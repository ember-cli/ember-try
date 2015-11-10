'use strict';
var CoreObject      = require('core-object');
var RSVP            = require('rsvp');
var mapSeries       = require('promise-map-series');
var chalk           = require('chalk');
var ScenarioManager = require('../utils/scenario-manager');
var run             = require('../utils/run');
var findEmberPath   = require('./../utils/find-ember-path');
var ResultSummary   = require('./../utils/result-summary');

module.exports = CoreObject.extend({
  run: function(options) {
    var task = this;
    var scenarios = this.config.scenarios;
    task.ScenarioManager = new ScenarioManager({ui: task.ui, project: task.project});

    return task.ScenarioManager.setup().then(function() {
      return mapSeries(scenarios, task._runTestsForThisScenario, task).then(function(results) {
        var promise;
        if (options.skipCleanup) {
          // Create a fake promise for consistency
          promise = RSVP.Promise.resolve();
        } else {
          promise = task.ScenarioManager.cleanup();
        }
        return promise.then(function() {
          task._printResults(results);
          task._exitAsAppropriate(results);
        });
      }).catch(function(err) {
        task.ui.writeLine(err);
        task.ui.writeLine(err.stack);
        process.exit(1);
      });
    });
  },

  _runTestsForThisScenario: function(scenario) {
    var task = this;
    return this.ScenarioManager.changeTo(scenario)
      .then(function(scenarioDependencyState) {
        var runResults = {
          scenario: scenario.name,
          dependencyState: scenarioDependencyState
        };
        return task._runTests().then(function() {
          runResults.result = true;
          return RSVP.resolve(runResults);
        })
        .catch(function() {
          runResults.result = false;
          return RSVP.resolve(runResults);
        });
      });
  },

  _runTests: function() {
    var task = this;

    return findEmberPath(task.project.root)
      .then(function(emberPath) {
        return run('node', [emberPath, 'test'], {cwd: task.project.root});
      })
      .then(function() {
        return RSVP.resolve(true);
      })
      .catch(function(err) {
        return RSVP.resolve(false);
      });
  },

  _printResults: function(results) {
    new ResultSummary({ui: this.ui, results: results}).print();
  },

  _exitAsAppropriate: function(results) {
    var outcomes = results.map(function(result) {
      return result.result;
    });
    if (outcomes.indexOf(false) > -1) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
});
