'use strict';
var debug = require('debug')('ember-try:commands:try-each');

module.exports = {
  name: 'try:each',
  description: 'Runs each of the dependency scenarios specified in config with the specified command. The command defaults to `ember test`' ,
  works: 'insideProject',

  availableOptions: [
    { name: 'skip-cleanup',  type: Boolean, default: false },
    { name: 'config-path', type: String, default: 'config/ember-try.js' }
  ],

  _getConfig: require('../utils/config'),
  _TryEachTask: require('../tasks/try-each'),
  run: function(commandOptions) {
    debug('Options:\n', commandOptions);

    var config = this._getConfig({
      project: this.project,
      configPath: commandOptions.configPath
    });

    debug('Config: %s', JSON.stringify(config));

    var tryEachTask = new this._TryEachTask({
      ui: this.ui,
      project: this.project,
      config: config
    });

    return tryEachTask.run(config.scenarios, { skipCleanup: commandOptions.skipCleanup });
  }
};
