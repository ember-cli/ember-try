var BowerAdapter = require('./bower-adapter');
var NpmAdapter   = require('./npm-adapter');

module.exports = {
  generateFromConfig: function(config, root) {
    var hasNpm = false;
    var hasBower = false;
    var adapters = [];
    if (!config || !config.scenarios) {
      return [];
    }

    config.scenarios.forEach(function(scenario) {
      if (scenario.npm) {
        hasNpm = true;
      }
      if (scenario.bower || scenario.dependencies || scenario.devDependencies) {
        hasBower = true;
      }
    });
    if (hasNpm) {
      adapters.push(new NpmAdapter({cwd: root}));
    }
    if (hasBower) {
      adapters.push(new BowerAdapter({cwd: root}));
    }
    return adapters;
  }
};
