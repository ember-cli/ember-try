'use strict';

const debug = require('debug')('ember-try:commands:config');

module.exports = {
  name: 'try:config',
  description: 'Displays the config that will be used',
  works: 'insideProject',
  availableOptions: [{ name: 'config-path', type: String }],

  async run(commandOptions) {
    debug('Options:\n', commandOptions);

    let config = await require('../utils/config')({
      project: this.project,
      configPath: commandOptions.configPath,
    });

    this.ui.writeLine(JSON.stringify(config, null, 2));
  },
};
