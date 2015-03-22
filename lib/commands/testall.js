'use strict';

var path            = require('path');
var checkCanProceed = require('../utils/verify');


/*
 ember try:testall

 */
module.exports = {
  name: 'try:testall',
  description: 'Run test with the matrix of packages specified',
  works: 'insideProject',

  run: function(commandOptions, rawArgs) {
    checkCanProceed({project: this.project});

    var config = require('../utils/config')({ project: this.project });

    var TestallTask = require('../tasks/testall');

    var testallTask = new TestallTask({
      ui: this.ui,
      project: this.project,
      config: config
    });

    return testallTask.run(commandOptions);
  }
};
