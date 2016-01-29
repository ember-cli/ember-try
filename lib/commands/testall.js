'use strict';

module.exports = {
  name: 'try:testall',
  description: 'Runs `ember test` with each of the dependency scenarios specified in config.' ,
  works: 'insideProject',

  availableOptions: [
    { name: 'skip-cleanup',  type: Boolean, default: false }
  ],

  run: function(commandOptions, rawArgs) {

    var config = require('../utils/config')({ project: this.project });

    var TryEach = require('../tasks/try-each');

    var tryEachTask = new TryEach({
      ui: this.ui,
      project: this.project,
      config: config
    });

    return tryEachTask.run(config.scenarios, commandOptions);
  }
};
