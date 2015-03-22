var CoreObject   = require('core-object');
var fs           = require('fs');
var path         = require('path');
var run          = require('./run');
var BowerHelpers = require('../utils/bower-helpers');

module.exports = CoreObject.extend({
  changeTo: function(scenario){
    var manager = this;
    var bowerFile = path.join(manager.project.root, 'bower.json');
    return run('git', ['checkout', bowerFile]).then(function(){
      var bowerJSON = JSON.parse(fs.readFileSync(bowerFile));
      fs.writeFileSync(bowerFile, JSON.stringify(manager._bowerJSONForScenario(bowerJSON, scenario), null, 2));

      return BowerHelpers.install(manager.project.root);
    }).then(function(){
      manager._logVersions(scenario);
    });
  },

  _logVersions: function(scenario){
    var manager = this;
    var actualVersion, expectedVersion;
    var pkgs = Object.keys(scenario.dependencies);

    manager.ui.writeLine("For scenario " + scenario.name + ", using:");

    pkgs.map(function(dep){

      actualVersion = BowerHelpers.findVersion(dep, manager.project.root);
      expectedVersion = scenario.dependencies[dep];
      if(actualVersion != expectedVersion) { throw new Error("Versions do not match: " + actualVersion + ' expected: ' + expectedVersion);}
      manager.ui.writeLine("  " + dep + " " + actualVersion);

    });
  },

  _bowerJSONForScenario: function(bowerJSON, scenario){
    var pkgs = Object.keys(scenario.dependencies);

    pkgs.forEach(function(pkg){
      bowerJSON.dependencies[pkg] = scenario.dependencies[pkg];
    });

    return bowerJSON;
  }
});

