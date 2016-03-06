'use strict';
var debug = require('debug')('ember-try:commands:try-one');

module.exports = {
  name: 'try:one',
  description: 'Run any `ember` command with the specified dependency scenario. Takes an optional command,; put it after any options, preceded by " --- "',
  works: 'insideProject',

  anonymousOptions: [
    '<scenario>'
  ],

  availableOptions: [
    { name: 'skip-cleanup', type: Boolean, default: false },
    { name: 'config-path', type: String, default: 'config/ember-try.js' }
  ],

  _getConfig: require('../utils/config'),
  _TryEachTask: require('../tasks/try-each'),

  getCommand: function(_argv) {
    var args = (_argv || this._commandLineArguments()).slice();
    var separatorIndex = args.indexOf('---');
    if (separatorIndex === -1) {
      return [];
    }

    return args.slice(separatorIndex + 1);
  },

  run: function(commandOptions, rawArgs) {
    var scenarioName = rawArgs[0];

    debug('Scenario argument: %s', scenarioName);
    debug('Command options:\n', commandOptions);

    var commandArgs = this.getCommand();

    debug('Command specified on command line: %s', commandArgs.join(' '));

    if (!scenarioName) {
      throw new Error('The `ember try:one` command requires a ' +
                      'scenario name to be specified.');
    }

    var config = this._getConfig({
      project: this.project,
      configPath: commandOptions.configPath
    });

    debug('Config: %s', JSON.stringify(config));

    var scenario = findByName(config.scenarios, scenarioName);

    if (!scenario) {
      throw new Error('The `ember try:one` command requires a scenario ' +
                      'specified in the config file.');
    }

    var tryEachTask = new this._TryEachTask({
      ui: this.ui,
      project: this.project,
      config: config,
      commandArgs: commandArgs
    });

    return tryEachTask.run([scenario], { skipCleanup: commandOptions.skipCleanup });
  },

  _commandLineArguments: function() {
    return process.argv;
  }
};

function findByName(arr, name) {
  var matches = arr.filter(function(item) {
    if (item.name === name) {
      return item;
    }
  });
  return matches[0];
}
