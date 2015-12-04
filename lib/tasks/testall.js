'use strict';
var CoreObject      = require('core-object');
var RSVP            = require('rsvp');
var mapSeries       = require('promise-map-series');
var chalk           = require('chalk');
var ScenarioManager = require('./../utils/scenario-manager');
var runCommand      = require('./../utils/run-command');
var ResultSummary   = require('./../utils/result-summary');

module.exports = CoreObject.extend({
  run: function(options) {
    var task = this;
    var scenarios = this.config.scenarios;
    task.ScenarioManager = new ScenarioManager({ui: task.ui, project: task.project});
    return task.ScenarioManager.setup().then(function() {
      return mapSeries(scenarios, task._runTestsForThisScenario, task);
    }).then(function(results) {
      return task._optionallyCleanup(options).then(function() {
        task._printResults(results);
        task._exitAsAppropriate(results);
      });
    }).catch(function(err) {
      task.ui.writeLine(chalk.red('Error!'));
      if (err) {
        task.ui.writeLine(chalk.red(err));
        task.ui.writeLine(chalk.red(err.stack));
      }
      task._exit(1);
    });
  },

  _runTestsForThisScenario: function(scenario) {
    var task = this;
    return task.ScenarioManager.changeTo(scenario)
      .then(function(scenarioDependencyState) {
        var runResults = {
          scenario: scenario.name,
          dependencyState: scenarioDependencyState
        };
        return task._runTests().then(function(result) {
          runResults.result = result;
          return RSVP.resolve(runResults);
        });
      });
  },

  _runTests: function() {
    var task = this;
    return runCommand(task.project.root, ['test']);
  },

  _printResults: function(results) {
    new ResultSummary({ui: this.ui, results: results, command: 'ember test'}).print();
  },

  _exitAsAppropriate: function(results) {
    var outcomes = results.map(function(result) {
      return result.result;
    });
    this._exitBasedOnCondition(outcomes.indexOf(false) > -1);
  },

  _optionallyCleanup: function(options) {
    var task = this;
    var promise;
    if (options.skipCleanup) {
      // Create a fake promise for consistency
      promise = RSVP.Promise.resolve();
    } else {
      promise = task.ScenarioManager.cleanup();
    }
    return promise;
  },

  _exitBasedOnCondition: function(condition) {
    if (condition) {
      this._exit(1);
    } else {
      this._exit(0);
    }
  },

  _exit: function(code) {
    process.exit(code);
  }
});
