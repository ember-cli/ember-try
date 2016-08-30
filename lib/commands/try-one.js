'use strict';
var findByName = require('../utils/find-by-name');
var debug = require('debug')('ember-try:commands:try-one');

module.exports = {
  name: 'try:one',
  description: 'Run any `ember` command with the specified dependency scenario. This optional command is preceded by " --- " and will default to `ember test`',
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
    var tryOne = this;
    var scenarioName = rawArgs[0];

    debug('Scenario argument: %s', scenarioName);
    debug('Command options:\n', commandOptions);

    var commandArgs = tryOne.getCommand();

    debug('Command specified on command line: %s', commandArgs.join(' '));

    if (!scenarioName) {
      throw new Error('The `ember try:one` command requires a ' +
                      'scenario name to be specified.');
    }

    var getConfig = tryOne._getConfig({
      project: tryOne.project,
      configPath: commandOptions.configPath
    });

    return getConfig.then(function(config) {
      debug('Config: %s', JSON.stringify(config));

      var scenario = findByName(config.scenarios, scenarioName);

      if (!scenario) {
        throw new Error('The `ember try:one` command requires a scenario ' +
                        'specified in the config.');
      }

      var tryEachTask = new tryOne._TryEachTask({
        ui: tryOne.ui,
        project: tryOne.project,
        config: config,
        commandArgs: commandArgs
      });

      return tryEachTask.run([scenario], { skipCleanup: commandOptions.skipCleanup });
    });
  },

  _commandLineArguments: function() {
    return process.argv;
  }
};
