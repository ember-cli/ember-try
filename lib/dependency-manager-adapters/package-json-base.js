'use strict';

var Base = require('./base');

module.exports = Base.extend({
  depFile: 'package.json',
  backupDepFile: 'package.json.ember-try',
  packagesFolder: 'node_modules',
  _newJSONForDependencySet(packageJSON, depSet) {

    this._overridePackageJSONDependencies(packageJSON, depSet, 'dependencies');
    this._overridePackageJSONDependencies(packageJSON, depSet, 'devDependencies');
    this._overridePackageJSONDependencies(packageJSON, depSet, 'peerDependencies');

    return packageJSON;
  },
  _overridePackageJSONDependencies(packageJSON, depSet, kindOfDependency) {
    if (!depSet[kindOfDependency]) { return; }
    let pkgs = Object.keys(depSet[kindOfDependency]);

    pkgs.forEach((pkg) => {
      if (!packageJSON[kindOfDependency]) {
        packageJSON[kindOfDependency] = {};
      }

      let version = depSet[kindOfDependency][pkg];
      if (version === null) {
        delete packageJSON[kindOfDependency][pkg];
      } else {
        packageJSON[kindOfDependency][pkg] = version;
      }
    });
  }
});
