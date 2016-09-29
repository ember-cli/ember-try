'use strict';
var debug = require('debug')('ember-try:commands:config');

module.exports = {
  name: 'try:config',
  description: 'Displays the config that will be used',
  works: 'insideProject',
  availableOptions: [
    { name: 'config-path', type: String, default: 'config/ember-try.js' }
  ],

  run: function(commandOptions) {
    var command = this;
    debug('Options:\n', commandOptions);
    var getConfig = require('../utils/config')({ project: this.project, configPath: commandOptions.configPath });
    return getConfig.then(function(config) {
      command.ui.writeLine(JSON.stringify(config, null, 2));
    });
  }
};
