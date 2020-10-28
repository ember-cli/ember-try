'use strict';

module.exports = {
  name: 'try:reset',
  description: 'Resets dependencies to their committed state. For when things get messy.',
  works: 'insideProject',

  async run() {
    let config = await require('../utils/config')({ project: this.project });
    let ResetTask = require('../tasks/reset');

    let resetTask = new ResetTask({
      ui: this.ui,
      project: this.project,
      config,
    });

    return await resetTask.run();
  },
};
