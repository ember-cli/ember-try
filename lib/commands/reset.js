'use strict';

module.exports = {
  name: 'try:reset',
  description: 'Resets dependencies to their committed state. For when things get messy.',
  works: 'insideProject',

  run: function() {
    var config = require('../utils/config')({ project: this.project });
    var ResetTask = require('../tasks/reset');
    var resetTask = new ResetTask({
      ui: this.ui,
      project: this.project,
      config: config
    });

    return resetTask.run();
  }
};
