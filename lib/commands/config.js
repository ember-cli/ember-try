'use strict';

module.exports = {
  name: 'try:config',
  description: 'Displays the config that will be used',
  works: 'insideProject',
  availableOptions: [
    { name: 'config-path', type: String, default: 'config/ember-try.js' }
  ],

  run: function(commandOptions) {
    var config = require('../utils/config')({ project: this.project, configPath: commandOptions.configPath });
    this.ui.writeLine(JSON.stringify(config, null, 2));
  }
};
