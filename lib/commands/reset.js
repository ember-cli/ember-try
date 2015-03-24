'use strict';

var path            = require('path');

module.exports = {
  name: 'try:reset',
  description: 'Checks out bower.json and runs bower install',
  works: 'insideProject',

  run: function(commandOptions, rawArgs) {
    var ResetTask = require('../tasks/reset');
    var resetTask = new ResetTask({
      ui: this.ui,
      project: this.project
    });

    return resetTask.run();
  }
};
