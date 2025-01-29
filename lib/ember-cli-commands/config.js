'use strict';

module.exports = {
  name: 'try:config',
  description: 'Displays the config that will be used',
  works: 'insideProject',
  availableOptions: [{ name: 'config-path', type: String }],

  async run({ configPath }) {
    const { config } = await import('../commands/config.mjs');

    await config({ configPath, cwd: this.project.root });
  },
};
