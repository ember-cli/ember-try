'use strict';

const debug = require('debug')('ember-try:commands:try-ember');

module.exports = {
  name: 'try:ember',
  description:
    'Runs with each Ember version matching the semver statement given. The command defaults to `ember test`',
  works: 'insideProject',

  anonymousOptions: ['<ember-semver-statement>'],

  availableOptions: [
    { name: 'skip-cleanup', type: Boolean, default: false },
    { name: 'config-path', type: String },
  ],

  _getConfig: require('../utils/config'),
  _TryEachTask: require('../tasks/try-each'),

  async run(commandOptions, rawArgs) {
    let emberVersion = rawArgs[0];

    debug('Options:\n', commandOptions);
    debug('Ember semver statement', emberVersion);

    let config = await this._getConfig({
      project: this.project,
      configPath: commandOptions.configPath,
      versionCompatibility: {
        ember: emberVersion,
      },
    });

    debug('Config: %s', JSON.stringify(config));

    let tryEachTask = new this._TryEachTask({
      ui: this.ui,
      project: this.project,
      config,
    });

    return await tryEachTask.run(config.scenarios, { skipCleanup: commandOptions.skipCleanup });
  },
};
