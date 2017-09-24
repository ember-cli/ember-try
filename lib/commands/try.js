'use strict';

module.exports = {
  name: 'try',
  description: 'Run any `ember` command with the specified dependency scenario',
  works: 'insideProject',

  anonymousOptions: [
    '<scenario>',
    '<command (Default: test)>',
  ],

  availableOptions: [
    { name: 'skip-cleanup', type: Boolean, default: false },
    { name: 'config-path', type: String, default: 'config/ember-try.js' },
  ],

  _getConfig: require('../utils/config'),
  _TryEachTask: require('../tasks/try-each'),

  getCommand(_argv) {
    let args = (_argv || this._commandLineArguments()).slice();
    let tryIndex = args.indexOf(this.name);
    let subcommandArgs = args.slice(tryIndex + 2);
    let skipIndex;

    // Remove ember-try options from the args that are passed on to ember
    skipIndex = subcommandArgs.indexOf('--skip-cleanup');
    if (skipIndex !== -1) {
      subcommandArgs.splice(skipIndex, 1);
    }

    skipIndex = subcommandArgs.indexOf('--config-path');
    if (skipIndex !== -1) {
      subcommandArgs.splice(skipIndex, 1);
    }

    if (subcommandArgs.length === 0) {
      return [];
    }

    subcommandArgs.unshift('ember');

    return subcommandArgs;
  },

  run(commandOptions, rawArgs) {
    let tryCmd = this;
    tryCmd.ui.writeDeprecateLine('The `ember try` command is deprecated in favor of `ember try:one`.\nExample: `ember try default-scenario serve --port 4201`, becomes:\n`ember try:one default-scenario --- ember serve --port 4201`');
    let scenarioName = rawArgs[0];

    let commandArgs = tryCmd.getCommand();

    if (!scenarioName) {
      throw new Error('The `ember try` command requires a ' +
                      'scenario name to be specified.');
    }

    let getConfig = tryCmd._getConfig({
      project: tryCmd.project,
      configPath: commandOptions.configPath,
    });

    return getConfig.then((config) => {
      let scenario = findByName(config.scenarios, scenarioName);

      if (!scenario) {
        throw new Error('The `ember try` command requires a scenario ' +
                        'specified in the config.');
      }

      let tryEachTask = new tryCmd._TryEachTask({
        ui: tryCmd.ui,
        project: tryCmd.project,
        config,
        commandArgs,
      });

      return tryEachTask.run([scenario], commandOptions);
    });
  },

  _commandLineArguments() {
    return process.argv;
  },
};

function findByName(arr, name) {
  let matches = arr.filter((item) => {
    if (item.name === name) {
      return item;
    }
  });
  return matches[0];
}
