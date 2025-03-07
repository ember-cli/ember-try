'use strict';

module.exports = {
  name: 'try:one',
  description:
    'Run any `ember` command with the specified dependency scenario. This optional command is preceded by " --- " and will default to `ember test`',
  works: 'insideProject',

  anonymousOptions: ['<scenario>'],

  availableOptions: [
    { name: 'config-path', type: String },
    { name: 'skip-cleanup', type: Boolean, default: false },
  ],

  async run({ configPath, skipCleanup }, [scenarioName]) {
    const { tryOne } = await import('../commands/try-one.mjs');

    await tryOne({ configPath, cwd: this.project.root, scenarioName, skipCleanup });
  },
};
