'use strict';

module.exports = {
  name: 'try:reset',
  description: 'Resets dependencies to their committed state. For when things get messy.',
  works: 'insideProject',

  run: function() {
    var command = this;
    var getConfig = require('../utils/config')({ project: this.project });
    var ResetTask = require('../tasks/reset');
    return getConfig.then(function(config) {
      var resetTask = new ResetTask({
        ui: command.ui,
        project: command.project,
        config: config
      });

      return resetTask.run();
    });
  }
};
