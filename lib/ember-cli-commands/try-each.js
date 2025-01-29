'use strict';

module.exports = {
  name: 'try:each',
  description:
    'Runs each of the dependency scenarios specified in config with the specified command. The command defaults to `ember test`',
  works: 'insideProject',

  availableOptions: [
    { name: 'config-path', type: String },
    { name: 'skip-cleanup', type: Boolean, default: false },
  ],

  async run({ configPath, skipCleanup }) {
    const { tryEach } = await import('../commands/try-each.mjs');

    await tryEach({ configPath, cwd: this.project.root, skipCleanup });
  },
};
