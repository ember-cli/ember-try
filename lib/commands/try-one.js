'use strict';

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
    if(separatorIndex === -1) {
      return [];
    }

    return args.slice(separatorIndex + 1);
  },

  run: function(commandOptions, rawArgs) {
    var scenarioName = rawArgs[0];

    var commandArgs = this.getCommand();

    if (!scenarioName) {
      throw new Error('The `ember try:one` command requires a ' +
                      'scenario name to be specified.');
    }

    var config = this._getConfig({
      project: this.project,
      configPath: commandOptions.configPath
    });

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

    return tryEachTask.run([scenario], commandOptions);
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
