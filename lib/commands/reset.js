'use strict';

module.exports = {
  name: 'try:reset',
  description: 'Resets dependencies to their committed state. For when things get messy.',
  works: 'insideProject',

  async run() {
    let cwd = this.project.root;
    let config = await require('../utils/config')({ cwd });
    let ResetTask = require('../tasks/reset');

    let resetTask = new ResetTask({
      config,
      cwd,
    });

    return await resetTask.run();
  },
};
