var CoreObject   = require('core-object');
var fs           = require('fs');
var path         = require('path');
var run          = require('./run');
var BowerHelpers = require('../utils/bower-helpers');
var Chalk        = require('chalk');

module.exports = CoreObject.extend({
  changeTo: function(scenario){
    var manager = this;
    var bowerFile = path.join(manager.project.root, 'bower.json');
    return run('git', ['checkout', bowerFile]).then(function(){
      var bowerJSON = JSON.parse(fs.readFileSync(bowerFile));

      fs.writeFileSync(bowerFile, JSON.stringify(manager._bowerJSONForScenario(bowerJSON, scenario), null, 2));

      return BowerHelpers.install(manager.project.root);
    }).then(function(){
      manager._checkVersions(scenario);
    });
  },

  _checkVersions: function(scenario){
    var manager = this;
    var actualVersion, expectedVersion;
    var pkgs = Object.keys(scenario.dependencies);

    manager.ui.writeLine("For scenario " + scenario.name + ", using:");

    pkgs.map(function(dep){

      actualVersion = BowerHelpers.findVersion(dep, manager.project.root);
      expectedVersion = scenario.dependencies[dep];
      manager.ui.writeLine("  " + dep + " " + actualVersion);
    });
  },

  _bowerJSONForScenario: function(bowerJSON, scenario){
    if(!scenario.dependencies) { throw new Error("No dependencies specified for scenario " + scenario.name); }
    var pkgs = Object.keys(scenario.dependencies);

    pkgs.forEach(function(pkg){
      bowerJSON.dependencies[pkg] = scenario.dependencies[pkg];
      if (scenario.resolutions && scenario.resolutions[pkg]) {
        bowerJSON.resolutions[pkg] = scenario.resolutions[pkg];
      } else if (scenario.dependencies && scenario.dependencies[pkg]) {
        bowerJSON.resolutions[pkg] = scenario.dependencies[pkg];
      } else {
        bowerJSON.resolutions[pkg] = {};
      }
    });

    return bowerJSON;
  }
});

