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
    return BowerHelpers.resetBowerFile(manager.project.root).then(function(){
      var bowerJSON = JSON.parse(fs.readFileSync(bowerFile));

      if(!bowerJSON.resolutions){
        bowerJSON.resolutions = {};
      }

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
      if(actualVersion !== expectedVersion) {
        manager.ui.writeLine(Chalk.yellow("Versions do not match: Expected: " + expectedVersion + " but saw " + actualVersion + " This might be ok, depending on the scenario"));
      }
      manager.ui.writeLine("  " + dep + " " + actualVersion);
    });
  },

  _bowerJSONForScenario: function(bowerJSON, scenario){
    if(!scenario.dependencies && !scenario.devDependencies) {
      throw new Error("No dependencies specified for scenario " + scenario.name);
    }

    var self = this;
    ['dependencies', 'devDependencies'].forEach(function(kindOfDependency) {
      self._overrideBowerJSONDependencies(bowerJSON, scenario, kindOfDependency);
    });

    return bowerJSON;
  },

  _overrideBowerJSONDependencies: function(bowerJSON, scenario, kindOfDependency) {
    if (!scenario[kindOfDependency]) { return; }
    var pkgs = Object.keys(scenario[kindOfDependency]);

    pkgs.forEach(function(pkg){
      bowerJSON[kindOfDependency][pkg] = scenario[kindOfDependency][pkg];

      if (scenario.resolutions && scenario.resolutions[pkg]) {
        bowerJSON.resolutions[pkg] = scenario.resolutions[pkg];
      } else {
        bowerJSON.resolutions[pkg] = scenario[kindOfDependency][pkg];
      }
    });
  }
});

