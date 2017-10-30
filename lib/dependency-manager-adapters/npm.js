'use strict';

var CoreObject = require('core-object');
var fs = require('fs-extra');
var RSVP = require('rsvp');
var path = require('path');
var extend = require('extend');
var debug = require('debug')('ember-try:dependency-manager-adapter:npm');
var rimraf = RSVP.denodeify(require('rimraf'));
var chalk = require('chalk');

module.exports = CoreObject.extend({
  init: function() {
    this._super.apply(this, arguments);
    this.run = this.run || require('../utils/run');
  },
  useYarnCommand: false,
  yarnLock: 'yarn.lock',
  configKey: 'npm',
  packageJSON: 'package.json',
  packageJSONBackupFileName: 'package.json.ember-try',
  nodeModules: 'node_modules',
  nodeModulesBackupLocation: '.node_modules.ember-try',
  setup: function(options) {
    if (!options) {
      options = {};
    }
    this._runYarnCheck(options.ui);
    return this._backupOriginalDependencies();
  },
  changeToDependencySet: function(depSet) {
    var adapter = this;
    depSet = depSet[adapter.configKey];

    debug('Changing to dependency set: %s', JSON.stringify(depSet));

    if (!depSet) { return RSVP.resolve([]); }
    var backupPackageJSON = path.join(adapter.cwd, adapter.packageJSONBackupFileName);
    var packageJSONFile = path.join(adapter.cwd, adapter.packageJSON);
    var packageJSON = JSON.parse(fs.readFileSync(backupPackageJSON));
    var newPackageJSON = adapter._packageJSONForDependencySet(packageJSON, depSet);

    debug('Write package.json with: \n', JSON.stringify(newPackageJSON));

    fs.writeFileSync(packageJSONFile, JSON.stringify(newPackageJSON, null, 2));
    return adapter._install().then(function() {
      var deps = extend({}, depSet.dependencies || {}, depSet.devDependencies || {});
      var currentDeps = Object.keys(deps).map(function(dep) {
        return {
          name: dep,
          versionExpected: deps[dep],
          versionSeen: adapter._findCurrentVersionOf(dep),
          packageManager: adapter.useYarnCommand ? 'yarn' : 'npm'
        };
      });

      debug('Switched to dependencies: \n', currentDeps);

      return RSVP.Promise.resolve(currentDeps);
    });
  },
  cleanup: function() {
    var adapter = this;

    return this._restoreOriginalDependencies().then(function() {
      debug('Remove backup package.json and node_modules');

      var cleanupTasks = [rimraf(path.join(adapter.cwd, adapter.packageJSONBackupFileName)),
        rimraf(path.join(adapter.cwd, adapter.nodeModulesBackupLocation))];

      return RSVP.all(cleanupTasks);
    }).catch(function(e) {
      console.log('Error cleaning up npm scenario:', e);
    });
  },
  _runYarnCheck: function(ui) {
    if (!this.useYarnCommand) {
      try {
        if (fs.statSync(path.join(this.cwd, this.yarnLock)).isFile()) {
          ui.writeLine(chalk.yellow('Detected a yarn.lock file, add useYarn: true to your configuration if you want to use Yarn to install npm dependencies.'));
        }
      } catch (e) {
        // If no yarn.lock is found, no need to warn.
      }
    }
  },
  _findCurrentVersionOf: function(packageName) {
    var filename = path.join(this.cwd, this.nodeModules, packageName, this.packageJSON);
    if (fs.existsSync(filename)) {
      return JSON.parse(fs.readFileSync(filename)).version;
    } else {
      return null;
    }
  },
  _install: function() {
    var adapter = this;
    var mgrOptions = this.managerOptions || [];

    debug('Run npm install with options %s', mgrOptions);

    var cmd = this.useYarnCommand ? 'yarn' : 'npm';
    if (this.useYarnCommand) {
      if (mgrOptions.indexOf('--no-lockfile') === -1) {
        mgrOptions = mgrOptions.concat(['--no-lockfile']);
      }
      // npm warns on incompatible engines
      // yarn errors, not a good experience
      if (mgrOptions.indexOf('--ignore-engines') === -1) {
        mgrOptions = mgrOptions.concat(['--ignore-engines']);
      }
    } else if (mgrOptions.indexOf('--no-shrinkwrap') === -1) {
      mgrOptions = mgrOptions.concat(['--no-shrinkwrap']);
    }

    return this.run(cmd, [].concat(['install'], mgrOptions), { cwd: this.cwd }).then(function() {
      if (!adapter.useYarnCommand) {
        debug('Run npm prune');
        return adapter.run(adapter.configKey, [].concat(['prune'], mgrOptions), { cwd: adapter.cwd });
      }
    });
  },
  _packageJSONForDependencySet: function(packageJSON, depSet) {

    this._overridePackageJSONDependencies(packageJSON, depSet, 'dependencies');
    this._overridePackageJSONDependencies(packageJSON, depSet, 'devDependencies');
    this._overridePackageJSONDependencies(packageJSON, depSet, 'peerDependencies');

    return packageJSON;
  },
  _overridePackageJSONDependencies: function(packageJSON, depSet, kindOfDependency) {
    if (!depSet[kindOfDependency]) { return; }
    var pkgs = Object.keys(depSet[kindOfDependency]);

    pkgs.forEach(function(pkg) {
      if (!packageJSON[kindOfDependency]) {
        packageJSON[kindOfDependency] = {};
      }

      var version = depSet[kindOfDependency][pkg];
      if (version === null) {
        delete packageJSON[kindOfDependency][pkg];
      } else {
        packageJSON[kindOfDependency][pkg] = version;
      }
    });
  },
  _restoreOriginalDependencies: function() {
    var copy = RSVP.denodeify(fs.copy);

    debug('Restoring original package.json and node_modules');

    var restoreTasks = [
      copy(path.join(this.cwd, this.packageJSONBackupFileName),
           path.join(this.cwd, this.packageJSON)),
      copy(path.join(this.cwd, this.nodeModulesBackupLocation),
           path.join(this.cwd, this.nodeModules), { clobber: true })
    ];

    return RSVP.all(restoreTasks);
  },
  _backupOriginalDependencies: function() {
    var copy = RSVP.denodeify(fs.copy);

    debug('Backing up package.json and node_modules');

    var backupTasks = [
      copy(path.join(this.cwd, this.packageJSON),
           path.join(this.cwd, this.packageJSONBackupFileName)),
      copy(path.join(this.cwd, this.nodeModules),
           path.join(this.cwd, this.nodeModulesBackupLocation), { clobber: true })];

    return RSVP.all(backupTasks);
  }
});
