'use strict';
var debug = require('debug')('ember-try:commands:try-ember');

module.exports = {
  name: 'try:ember',
  description: 'Runs with each Ember version matching the semver statement given. The command defaults to `ember test`',
  works: 'insideProject',

  anonymousOptions: [
    '<ember-semver-statement>'
  ],

  availableOptions: [
    { name: 'skip-cleanup',  type: Boolean, default: false },
    { name: 'config-path', type: String, default: 'config/ember-try.js' }
  ],

  _getConfig: require('../utils/config'),
  _TryEachTask: require('../tasks/try-each'),
  run: function(commandOptions, rawArgs) {
    var command = this;
    var emberVersion = rawArgs[0];

    debug('Options:\n', commandOptions);
    debug('Ember semver statement', emberVersion);

    var getConfig = command._getConfig({
      project: command.project,
      configPath: commandOptions.configPath,
      versionCompatibility: {
        ember: emberVersion
      }
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
