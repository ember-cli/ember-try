'use strict';
var CoreObject      = require('core-object');
var RSVP            = require('rsvp');
var mapSeries       = require('promise-map-series');
var chalk           = require('chalk');
var debug           = require('debug')('ember-try:task:try-each');
var runCommand      = require('./../utils/run-command');

module.exports = CoreObject.extend({
  run: function(scenarios, options) {
    // Required lazily to improve startup speed.
    var ScenarioManager = require('./../utils/scenario-manager');
    var DependencyManagerAdapterFactory = require('./../utils/dependency-manager-adapter-factory');

    var task = this;
    var dependencyManagerAdapters = task.dependencyManagerAdapters || DependencyManagerAdapterFactory.generateFromConfig(task.config, task.project.root);
    debug('DependencyManagerAdapters: %s', dependencyManagerAdapters.map(function(item) { return item.configKey; }));
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
      debug('Scenario Manager setup');
      return mapSeries(scenarios, task._runCommandForThisScenario, task);
    }).then(function(results) {
      return task._optionallyCleanup(options).then(function() {
        debug('Output results');
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
        task._writeHeader('Scenario: ' + scenario.name);
        var command = task._determineCommandFor(scenario);
        var runResults = {
          scenario: scenario.name,
          allowedToFail: !!scenario.allowedToFail,
          dependencyState: scenarioDependencyState,
          command: command.join(' ')
        };

        debug('With:\n', runResults);

        return task._runCommand({commandArgs: command, commandOptions: task._commandOptions()}).then(function(result) {
          runResults.result = result;
          task._writeFooter('Result: ' + result);
          return RSVP.resolve(runResults);
        });
      });
  },

  _writeHeader: function(text) {
    var task = this;
    var count = 75 - text.length;
    var separator = new Array(count + 1).join('=');
    task.ui.writeLine(chalk.blue('\n=== ' + text + ' ' + separator + '\n'));
  },

  _writeFooter: function(text) {
    var task = this;
    task.ui.writeLine(chalk.blue('\n' + text));
    task.ui.writeLine(chalk.blue('---\n'));
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
    // Required lazily to improve startup speed.
    var ResultSummary   = require('./../utils/result-summary');

    new ResultSummary({ui: this.ui, results: results}).print();
  },

  _exitAsAppropriate: function(results) {
    var outcomes = results.map(function(result) {
      return result.result || result.allowedToFail;
    });
    this._exitBasedOnCondition(outcomes.indexOf(false) > -1);
  },

  _optionallyCleanup: function(options) {
    debug('Cleanup');
    delete process.env.EMBER_TRY_CURRENT_SCENARIO;

    var task = this;
    var promise;
    if (options && options.skipCleanup) {
      // Create a fake promise for consistency
      debug('Skip ScenarioManager cleanup');
      promise = RSVP.Promise.resolve();
    } else {
      debug('Cleanup ScenarioManager');
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
    debug('Exit %s', code);
    process.exit(code);
  },

  _on: function(signal, fn) {
    process.on(signal, fn);
  }

});
