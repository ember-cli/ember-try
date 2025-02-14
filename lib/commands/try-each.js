'use strict';
const debug = require('debug')('ember-try:commands:try-each');

module.exports = {
  name: 'try:each',
  description:
    'Runs each of the dependency scenarios specified in config with the specified command. The command defaults to `ember test`',
  works: 'insideProject',

  availableOptions: [
    { name: 'skip-cleanup', type: Boolean, default: false },
    { name: 'config-path', type: String },
  ],

  _getConfig: require('../utils/config'),
  _TryEachTask: require('../tasks/try-each'),

  async run(commandOptions) {
    debug('Options:\n', commandOptions);

    let cwd = this.project.root;
    let config = await this._getConfig({
      configPath: commandOptions.configPath,
      cwd,
    });

    debug('Config: %s', JSON.stringify(config));

    let tryEachTask = new this._TryEachTask({
      config,
      cwd,
    });

    return await tryEachTask.run(config.scenarios, { skipCleanup: commandOptions.skipCleanup });
  },
};
