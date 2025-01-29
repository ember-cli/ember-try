'use strict';

module.exports = {
  name: 'try:ember',
  description:
    'Runs with each Ember version matching the semver statement given. The command defaults to `ember test`',
  works: 'insideProject',

  anonymousOptions: ['<ember-semver-statement>'],

  availableOptions: [
    { name: 'config-path', type: String },
    { name: 'skip-cleanup', type: Boolean, default: false },
  ],

  async run({ configPath, skipCleanup }, [ember]) {
    const { tryEmber } = await import('../commands/try-ember.mjs');

    await tryEmber({ configPath, cwd: this.project.root, ember, skipCleanup });
  },
};
