'use strict';

const debug = require('debug')('ember-try:commands:try-one');

module.exports = {
  name: 'try:one',
  description:
    'Run any `ember` command with the specified dependency scenario. This optional command is preceded by " --- " and will default to `ember test`',
  works: 'insideProject',

  anonymousOptions: ['<scenario>'],

  availableOptions: [
    { name: 'skip-cleanup', type: Boolean, default: false },
    { name: 'config-path', type: String },
  ],

  _getConfig: require('../utils/config'),
  _TryEachTask: require('../tasks/try-each'),

  getCommand(_argv) {
    let args = (_argv || this._commandLineArguments()).slice();
    let separatorIndex = args.indexOf('---');
    if (separatorIndex === -1) {
      return [];
    }

    return args.slice(separatorIndex + 1);
  },

  async run(commandOptions, rawArgs) {
    let scenarioName = rawArgs[0];

    debug('Scenario argument: %s', scenarioName);
    debug('Command options:\n', commandOptions);

    let commandArgs = this.getCommand();

    debug('Command specified on command line: %s', commandArgs.join(' '));

    if (!scenarioName) {
      throw new Error('The `ember try:one` command requires a ' + 'scenario name to be specified.');
    }

    let cwd = this.project.root;
    let config = await this._getConfig({
      configPath: commandOptions.configPath,
      cwd,
    });

    debug('Config: %s', JSON.stringify(config));

    let scenario = config.scenarios.find((s) => s.name === scenarioName);
    if (!scenario) {
      throw new Error(
        'The `ember try:one` command requires a scenario ' + 'specified in the config.',
      );
    }

    let tryEachTask = new this._TryEachTask({
      commandArgs,
      config,
      cwd,
    });

    return await tryEachTask.run([scenario], { skipCleanup: commandOptions.skipCleanup });
  },

  _commandLineArguments() {
    return process.argv;
  },
};
