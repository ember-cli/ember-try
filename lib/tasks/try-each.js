'use strict';
var CoreObject      = require('core-object');
var RSVP            = require('rsvp');
var mapSeries       = require('promise-map-series');
var chalk           = require('chalk');
var ScenarioManager = require('./../utils/scenario-manager');
var runCommand      = require('./../utils/run-command');
var ResultSummary   = require('./../utils/result-summary');
var DependencyManagerAdapterFactory = require('./../utils/dependency-manager-adapter-factory');

module.exports = CoreObject.extend({
  run: function(scenarios, options) {
    var task = this;
    var dependencyManagerAdapters = task.dependencyManagerAdapters || DependencyManagerAdapterFactory.generateFromConfig(task.config, task.project.root);
    task.ScenarioManager = new ScenarioManager({ui: task.ui,
                                                dependencyManagerAdapters: dependencyManagerAdapters
    });

    var shutdownCount = 0;
    task._on('SIGINT', function() {
      if (shutdownCount === 0) {
        shutdownCount++;
        task.ui.writeLine('\nGracefully shutting down from SIGINT (Ctrl-C)');
        return task.ScenarioManager.cleanup().then(function() {
          task._exit();
        });
      } else {
        task.ui.writeLine('\nOk, but it\'s going to be a mess');
        task._exit();
      }
    });

    return task.ScenarioManager.setup().then(function() {
      return mapSeries(scenarios, task._runCommandForThisScenario, task);
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

  _runCommandForThisScenario: function(scenario) {
    var task = this;
    return task.ScenarioManager.changeTo(scenario)
      .then(function(scenarioDependencyState) {
        process.env.EMBER_TRY_CURRENT_SCENARIO = scenario.name;
        var command = task._determineCommandFor(scenario);
        var runResults = {
          scenario: scenario.name,
          dependencyState: scenarioDependencyState,
          command: command.join(' ')
        };

        return task._runCommand({commandArgs: command, commandOptions: task._commandOptions()}).then(function(result) {
          runResults.result = result;
          return RSVP.resolve(runResults);
        });
      });
  },

  _determineCommandFor: function(scenario) {
    var task = this;

    if (task.commandArgs && task.commandArgs.length) {
      return this.commandArgs;
    }

    if (scenario.command) {
      return scenario.command.split(' ');
    }

    if (task.config.command) {
      return task.config.command.split(' ');
    }

    return this._defaultCommandArgs();
  },

  _runCommand: function(options) {
    return runCommand(this.project.root, options.commandArgs, options.commandOptions);
  },

  _commandOptions: function() {
    return this.commandOptions;
  },

  _defaultCommandArgs: function() {
    return ['ember', 'test'];
  },

  _printResults: function(results) {
    new ResultSummary({ui: this.ui, results: results}).print();
  },

  _exitAsAppropriate: function(results) {
    var outcomes = results.map(function(result) {
      return result.result;
    });
    this._exitBasedOnCondition(outcomes.indexOf(false) > -1);
  },

  _optionallyCleanup: function(options) {
    delete process.env.EMBER_TRY_CURRENT_SCENARIO;

    var task = this;
    var promise;
    if (options && options.skipCleanup) {
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
  },

  _on: function(signal, fn) {
    process.on(signal, fn);
  }

});
