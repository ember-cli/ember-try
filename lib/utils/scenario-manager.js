var CoreObject   = require('core-object');
var fs           = require('fs');
var path         = require('path');
var run          = require('./run');
var BowerHelpers = require('../utils/bower-helpers');
var NpmHelpers   = require('../utils/npm-helpers');
var Chalk        = require('chalk');
var RSVP         = require('rsvp');

module.exports = CoreObject.extend({
  changeTo: function(scenario){
    var manager = this;
    return NpmHelpers.resetNpmFile(manager.project.root)
      .then(function() {
        return BowerHelpers.resetBowerFile(manager.project.root);
      })
      .then(function(){
        var bowerFile = path.join(manager.project.root, 'bower.json');
        var npmFile = path.join(manager.project.root, 'package.json');

        var bowerJSON = JSON.parse(fs.readFileSync(bowerFile));
        var npmJSON = JSON.parse(fs.readFileSync(npmFile))
       
        bowerJSON.resolutions = bowerJSON.resolutions || {};
        npmJSON.resolutions = npmJSON.resolutions || {};

        fs.writeFileSync(npmFile, JSON.stringify(manager._manifestJSONForScenario(npmJSON, scenario, 'npm'), null, 2));
        fs.writeFileSync(bowerFile, JSON.stringify(manager._manifestJSONForScenario(bowerJSON, scenario), null, 2));

        return NpmHelpers.install(manager.project.root, scenario).then(function() {
          return BowerHelpers.install(manager.project.root, scenario);
        });
      }).then(function(){
        manager._checkVersions(scenario);
      });
  },

  _checkVersions: function(scenario, packageManagerKey){
    if (!packageManagerKey && !!scenario.bower) {
      packageManagerKey = 'bower';
    }
    var scenarioData = packageManagerKey ? scenario[packageManagerKey] : scenario;
    var manager = this;
    var actualVersion, expectedVersion;

    var pkgs = Object.keys(scenarioData.dependencies);

    manager.ui.writeLine("For scenario " + scenario.name + ", using:");

    pkgs.map(function(dep){

      actualVersion = BowerHelpers.findVersion(dep, manager.project.root);
      expectedVersion = scenarioData.dependencies[dep];
      if(actualVersion !== expectedVersion) {
        manager.ui.writeLine(Chalk.yellow("Versions do not match: Expected: " + expectedVersion + " but saw " + actualVersion + " This might be ok, depending on the scenario"));
      }
      manager.ui.writeLine("  " + dep + " " + actualVersion);
    });
  },

  _manifestJSONForScenario: function(base, scenario, packageManagerKey){
    if (!packageManagerKey && !!scenario.bower) {
      packageManagerKey = 'bower';
    }

    var scenarioData = packageManagerKey ? scenario[packageManagerKey] : scenario ;
    if(!scenarioData.dependencies && !scenarioData.devDependencies) {
      throw new Error("No dependencies specified for scenario " + scenario.name);
    }

    var self = this;
    ['dependencies', 'devDependencies'].forEach(function(kindOfDependency) {
      self._overrideManifestJSONDependencies(base, scenarioData, kindOfDependency);
    });

    return base;
  },

  _overrideManifestJSONDependencies: function(base, scenario, kindOfDependency) {
    if (!scenario[kindOfDependency]) { return; }
    var pkgs = Object.keys(scenario[kindOfDependency]);

    pkgs.forEach(function(pkg){
      base[kindOfDependency][pkg] = scenario[kindOfDependency][pkg];
      base.resolutions = base.resolutions || {};
      if (scenario.resolutions && scenario.resolutions[pkg]) {
        base.resolutions[pkg] = scenario.resolutions[pkg];
      } else {
        base.resolutions[pkg] = scenario[kindOfDependency][pkg];
      }
    });
  }
});

