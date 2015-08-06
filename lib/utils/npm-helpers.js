var path   = require('path');
var fs     = require('fs-extra');
var RSVP   = require('rsvp');
var run    = require('./run');
var rimraf = RSVP.denodeify(require('rimraf'));

module.exports = {

  /**
   * For a given scenario, get a list of NPM libraries that should be removed from
   *  the node_modules folder, in order to effectively set the secenario up.
   *
   * @param  {Object} scenario - a complete scenario object
   * @return {Array} an array of strings -- names of folders in node_modules that
   *    should be deleted before the scenario is "installed"
   */
  _npmFoldersToClearForScenario: function(scenario) {
    return ['dependencies', 'devDependencies'].reduce(function(acc, depType) {
      var deps = (scenario.npm && scenario.npm[depType]) ? scenario.npm[depType] : [];
      return acc.concat(Object.keys(deps));
    }, []);
  },

  /**
   * For a given scenarion, get a list of versioned npm packages that
   *   should be installed.
   *
   * @param  {Object} scenario - a complete scenario object
   * @return {Array} an array of strings - packages with version
   *    in npm notation (i.e., "rsvp@~1.0.2")
   */
  _npmFoldersToInstallForScenario: function(scenario) {
    var packages = [];

    ['dependencies', 'devDependencies'].forEach(function(depType) {
      for (var pkgName in (scenario.npm[depType] || [])) {
        if (scenario.npm[depType][pkgName]) {
          var pkgIdentifier = pkgName;
          packages.push(pkgIdentifier);
        }
      }
    });
    return packages;
  },

  deleteNpmPackages: function(root, pkgNames) {
    return RSVP.all(pkgNames.map(function(pkgName) {
      return this.deleteNpmPackage(root, pkgName);
    }.bind(this)));
  },

  installNpmPackages: function(root, pkgNames) {
    return run('npm', ['install'].concat(pkgNames), {cwd: root});
  },

  deleteNpmPackage: function(root, pkgName) {
    return rimraf(path.join(root, 'node_modules', pkgName));
  },

  install: function(root, scenario) {
    if (!fs.existsSync(path.join(root, 'node_modules')) || !scenario) {
      // Clean npm install
      return run('npm', ['install'], {cwd: root});
    } else {
      return this.deleteNpmPackages(root, this._npmFoldersToClearForScenario(scenario))
        .then(function() {
          return run('npm', ['install'], {cwd: root});
        }.bind(this));
    }
  },

  resetNpmFile: function(root) {
    var copy = RSVP.denodeify(fs.copy);
    return copy(path.join(root, 'package.json.ember-try'),
                path.join(root, 'package.json'));
  },

  backupNpmFile: function(root) {
    var copy = RSVP.denodeify(fs.copy);
    return copy(path.join(root, 'package.json'),
                path.join(root, 'package.json.ember-try'));
  },

  cleanup: function(root, scenario) {
    return this.resetNpmFile(root).then(function() {
      return rimraf(path.join(root, 'package.json.ember-try'));
    })
    .catch(function(e) {
      console.error('Problem cleaning up npm scenario: ', e);
    })
    .then(function() {
      return this.install(root, scenario);
    }.bind(this));
  }
};
