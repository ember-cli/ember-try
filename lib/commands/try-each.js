'use strict';
var debug = require('debug')('ember-try:commands:try-each');

module.exports = {
  name: 'try:each',
  description: 'Runs each of the dependency scenarios specified in config with the specified command. The command defaults to `ember test`',
  works: 'insideProject',

  availableOptions: [
    { name: 'skip-cleanup',  type: Boolean, default: false },
    { name: 'config-path', type: String, default: 'config/ember-try.js' }
  ],

  _getConfig: require('../utils/config'),
  _TryEachTask: require('../tasks/try-each'),
  run: function(commandOptions) {
    var command = this;
    debug('Options:\n', commandOptions);

    var getConfig = command._getConfig({
      project: command.project,
      configPath: commandOptions.configPath
    });

    return getConfig.then(function(config) {
      debug('Config: %s', JSON.stringify(config));

      var tryEachTask = new command._TryEachTask({
        ui: command.ui,
        project: command.project,
        config: config
      });

      return tryEachTask.run(config.scenarios, { skipCleanup: commandOptions.skipCleanup });
    });

  }
};
