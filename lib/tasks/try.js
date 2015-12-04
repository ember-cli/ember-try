'use strict';
var CoreObject      = require('core-object');
var RSVP            = require('rsvp');
var ScenarioManager = require('./../utils/scenario-manager');
var runCommand      = require('./../utils/run-command');
var chalk           = require('chalk');
var ResultSummary   = require('./../utils/result-summary');

module.exports = CoreObject.extend({
  run: function(scenario, commandArgs, options) {
    var task = this;
    task.ScenarioManager = new ScenarioManager({ui: task.ui, project: task.project});

    process.on('SIGINT', function() {
      task.ui.writeLine('\nGracefully shutting down from SIGINT (Ctrl-C)');
      task.ScenarioManager.cleanup().then(function() {
        process.exit();
      });
    });

    return task.ScenarioManager.setup().then(function() {
      return task.ScenarioManager.changeTo(scenario);
    })
    .then(function(scenarioDependencyState) {
      return runCommand(task.project.root, commandArgs).then(function(result) {
        return RSVP.resolve({
          result: result,
          scenario: scenario.name,
          dependencyState: scenarioDependencyState
        });
      });
    })
    .then(function(resultInfo) {
      return task._optionallyCleanup(options).then(function() {
        task._printResults(resultInfo, commandArgs);
        task._exitBasedOnCondition(!resultInfo.result);
      });
    })
    .catch(function(err) {
      task.ui.writeLine(chalk.red(err));
      task.ui.writeLine(chalk.red(err.stack));
      process.exit(1);
    });
  },
  _printResults: function(result, commandArgs) {
    new ResultSummary({ui: this.ui, results: [result], command: commandArgs.join(' ')}).print();
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
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
});
