'use strict';

const CoreObject = require('core-object');
const chalk = require('chalk');
const debug = require('debug')('ember-try:task:try-each');
const runCommand = require('./../utils/run-command');

module.exports = CoreObject.extend({
  async run(scenarios, options) {
    // Required lazily to improve startup speed.
    let ScenarioManager = require('./../utils/scenario-manager');
    let DependencyManagerAdapterFactory = require('./../utils/dependency-manager-adapter-factory');
    this.ResultSummary = require('./../utils/result-summary');

    let dependencyManagerAdapters =
      this.dependencyManagerAdapters ||
      DependencyManagerAdapterFactory.generateFromConfig(this.config, this.project.root);
    debug(
      'DependencyManagerAdapters: %s',
      dependencyManagerAdapters.map((item) => {
        return item.configKey;
      })
    );
    this.ScenarioManager = new ScenarioManager({
      ui: this.ui,
      dependencyManagerAdapters,
    });

    this._canceling = false;
    this._on('SIGINT', () => {
      this._canceling = true;
      this.ui.writeLine('\nGracefully shutting down from SIGINT (Ctrl-C)');
      return this.ScenarioManager.cleanup();
    });

    try {
      await this.ScenarioManager.setup();
      debug('Scenario Manager setup');

      let results = [];
      for (let scenario of scenarios) {
        results.push(await this._runCommandForThisScenario(scenario));
      }

      await this._optionallyCleanup(options);

      debug('Output results');
      this._printResults(results);

      return this._exitAsAppropriate(results);
    } catch (err) {
      this.ui.writeLine(chalk.red('Error!'));

      if (err) {
        this.ui.writeLine(chalk.red(err));
        this.ui.writeLine(chalk.red(err.stack));
      }

      return 1; // Signifies exit code
    }
  },

  async _runCommandForThisScenario(scenario) {
    if (this._canceling) {
      return;
    }

    let scenarioDependencyState = await this.ScenarioManager.changeTo(scenario);

    if (this._canceling) {
      return;
    }

    process.env.EMBER_TRY_CURRENT_SCENARIO = scenario.name;
    this._writeHeader(`Scenario: ${scenario.name}`);

    let command = this._determineCommandFor(scenario);
    let runResults = {
      scenario: scenario.name,
      allowedToFail: !!scenario.allowedToFail,
      dependencyState: scenarioDependencyState,
      envState: scenario.env,
      command: command.join(' '),
    };

    debug('With:\n', runResults);

    let result = await this._runCommand({
      commandArgs: command,
      commandOptions: this._commandOptions(scenario.env),
    });

    if (this._canceling) {
      return;
    }

    runResults.result = result;
    this._writeFooter(`Result: ${result}`);

    return runResults;
  },

  _writeHeader(text) {
    let count = 75 - text.length;
    let separator = new Array(count + 1).join('=');
    this.ui.writeLine(chalk.blue(`\n=== ${text} ${separator}\n`));
  },

  _writeFooter(text) {
    this.ui.writeLine(chalk.blue(`\n${text}`));
    this.ui.writeLine(chalk.blue('---\n'));
  },

  _determineCommandFor(scenario) {
    if (this.commandArgs && this.commandArgs.length) {
      return this.commandArgs;
    }

    if (scenario.command) {
      return scenario.command.split(' ');
    }

    if (this.config.command) {
      return this.config.command.split(' ');
    }

    return this._defaultCommandArgs();
  },

  _runCommand(options) {
    return runCommand(this.project.root, options.commandArgs, options.commandOptions);
  },

  _commandOptions(env) {
    let options = this.commandOptions || {};
    if (env) {
      options.env = Object.assign({}, process.env, env);
    }
    return options;
  },

  _defaultCommandArgs() {
    return ['ember', 'test'];
  },

  _printResults(results) {
    new this.ResultSummary({ ui: this.ui, results }).print();
  },

  _exitAsAppropriate(results) {
    let outcomes = results.map((result) => {
      return result.result || result.allowedToFail;
    });

    return this._exitBasedOnCondition(outcomes.indexOf(false) > -1);
  },

  async _optionallyCleanup(options) {
    debug('Cleanup');
    delete process.env.EMBER_TRY_CURRENT_SCENARIO;

    if (options && options.skipCleanup) {
      // Create a fake promise for consistency
      debug('Skip ScenarioManager cleanup');
    } else {
      debug('Cleanup ScenarioManager');
      return await this.ScenarioManager.cleanup();
    }
  },

  _exitBasedOnCondition(condition) {
    let exitCode = condition ? 1 : 0;
    debug('Exit %s', exitCode);
    return exitCode;
  },

  _exit(code) {
    debug('Exit %s', code);
    process.exit(code);
  },

  _on(signal, fn) {
    process.on(signal, fn);
  },
});
