'use strict';

const debug = require('debug')('ember-try:commands:config');
const { log } = require('../utils/console');

module.exports = {
  name: 'try:config',
  description: 'Displays the config that will be used',
  works: 'insideProject',
  availableOptions: [{ name: 'config-path', type: String }],

  async run(commandOptions) {
    debug('Options:\n', commandOptions);

    let cwd = this.project.root;
    let config = await require('../utils/config')({
      configPath: commandOptions.configPath,
      cwd,
    });

    log(JSON.stringify(config, null, 2));
  },
};
