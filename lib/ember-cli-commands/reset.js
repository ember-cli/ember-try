'use strict';

module.exports = {
  name: 'try:reset',
  description: 'Resets dependencies to their committed state. For when things get messy.',
  works: 'insideProject',
  availableOptions: [{ name: 'config-path', type: String }],

  async run({ configPath }) {
    const { reset } = await import('../commands/reset.mjs');

    await reset({ configPath, cwd: this.project.root });
  },
};
