'use strict';

var CoreObject = require('core-object');
var fs = require('fs-extra');
var RSVP = require('rsvp');
var path = require('path');
var extend = require('extend');
var debug = require('debug')('ember-try:dependency-manager-adapter:bower');
var rimraf = RSVP.denodeify(require('rimraf'));
var resolve = RSVP.denodeify(require('resolve'));
var findEmberPath = require('../utils/find-ember-path');

module.exports = CoreObject.extend({
  init: function() {
    this._super.apply(this, arguments);
    this.run = this.run || require('../utils/run');
    this.hasBowerFileInitially = fs.existsSync(path.join(this.cwd, this.bowerJSONFileName));
  },
  bowerJSONFileName: 'bower.json',
  bowerJSONBackupFileName: 'bower.json.ember-try',
  defaultBowerJSON: {
    name: 'ember-try-placeholder',
    dependencies: {}
  },
  configKey: 'bower',
  setup: function() {
    if (this.hasBowerFileInitially) {
      return this._backupBowerFile();
    } else {
      return RSVP.resolve();
    }
  },
  _getDependencySetAccountingForDeprecatedTopLevelKeys: function(depSet) {
    if (depSet[this.configKey]) {
      return depSet[this.configKey];
    }
    return { dependencies: depSet.dependencies, devDependencies: depSet.devDependencies, resolutions: depSet.resolutions };
  },
  _writeBowerFileWithDepSetChanges: function(depSet) {
    var adapter = this;
    var baseBowerJSON;
    var bowerFile = path.join(adapter.cwd, adapter.bowerJSONFileName);

    if (this.hasBowerFileInitially) {
      var backupBowerFile = path.join(adapter.cwd, adapter.bowerJSONBackupFileName);
      baseBowerJSON = JSON.parse(fs.readFileSync(backupBowerFile));
    } else {
      baseBowerJSON = this.defaultBowerJSON;
    }

    var newBowerJSON = adapter._bowerJSONForDependencySet(baseBowerJSON, depSet);

    debug('Write bower.json with: \n', JSON.stringify(newBowerJSON));

    fs.writeFileSync(bowerFile, JSON.stringify(newBowerJSON, null, 2));
  },
  changeToDependencySet: function(depSet) {
    var adapter = this;
    depSet = this._getDependencySetAccountingForDeprecatedTopLevelKeys(depSet);

    debug('Changing to dependency set: %s', JSON.stringify(depSet));

    if (!depSet) { return RSVP.resolve([]); }

    adapter._writeBowerFileWithDepSetChanges(depSet);

    return adapter._install().then(function() {
      var deps = extend({}, depSet.dependencies || {}, depSet.devDependencies || {});
      var currentDeps = Object.keys(deps).map(function(dep) {
        return {
          name: dep,
          versionExpected: deps[dep],
          versionSeen: adapter._findCurrentVersionOf(dep),
          packageManager: 'bower'
        };
      });

      debug('Switched to dependencies: \n', currentDeps);

      return RSVP.Promise.resolve(currentDeps);
    });
  },
  cleanup: function() {
    var adapter = this;
    if (this.hasBowerFileInitially) {
      return adapter._restoreOriginalBowerFile().then(function() {
        debug('Remove backup bower.json');
        return rimraf(path.join(adapter.cwd, adapter.bowerJSONBackupFileName));
      }).catch(function(e) {
        console.log('Error cleaning up bower scenario:', e);
      })
      .then(function() {
        return adapter._install();
      });
    } else {
      return rimraf(path.join(adapter.cwd, adapter.bowerJSONFileName)).then(function() {
        return rimraf(path.join(adapter.cwd, 'bower_components'));
      });
    }
  },
  _findCurrentVersionOf: function(packageName) {
    var filename = path.join(this.cwd, 'bower_components', packageName, 'bower.json');
    if (fs.existsSync(filename)) {
      return JSON.parse(fs.readFileSync(filename)).version;
    } else {
      return null;
    }
  },
  _install: function() {
    var adapter = this;
    var options = this.managerOptions || [];

    if (options.indexOf('--config.interactive=false') === -1) {
      options = options.concat(['--config.interactive=false']);
    }

    return rimraf(path.join(adapter.cwd, 'bower_components'))
      .then(function() {
        debug('Remove bower_components');
        return adapter._findBowerPath(adapter.cwd);
      })
      .then(function(bowerPath) {
        debug('Run bower install using bower at %s', bowerPath);
        debug('Run bower install with options %s', options);
        return adapter.run('node', [].concat([bowerPath, 'install'], options), { cwd: adapter.cwd });
      });
  },
  _bowerJSONForDependencySet: function(bowerJSON, depSet) {
    if (!bowerJSON.resolutions) {
      bowerJSON.resolutions = {};
    }

    this._overrideBowerJSONDependencies(bowerJSON, depSet, 'dependencies');
    this._overrideBowerJSONDependencies(bowerJSON, depSet, 'devDependencies');

    return bowerJSON;
  },
  _overrideBowerJSONDependencies: function(bowerJSON, depSet, kindOfDependency) {
    if (!depSet[kindOfDependency]) { return; }
    var pkgs = Object.keys(depSet[kindOfDependency]);

    pkgs.forEach(function(pkg) {
      if (!bowerJSON[kindOfDependency]) {
        bowerJSON[kindOfDependency] = {};
      }

      var version = depSet[kindOfDependency][pkg];
      if (version === null) {
        delete bowerJSON[kindOfDependency][pkg];
        delete bowerJSON.resolutions[pkg];
      } else {
        bowerJSON[kindOfDependency][pkg] = version;

        if (depSet.resolutions && depSet.resolutions[pkg]) {
          bowerJSON.resolutions[pkg] = depSet.resolutions[pkg];
        } else {
          bowerJSON.resolutions[pkg] = version;
        }
      }
    });
  },
  _restoreOriginalBowerFile: function() {
    var copy = RSVP.denodeify(fs.copy);

    debug('Restore original bower.json');

    return copy(path.join(this.cwd, this.bowerJSONBackupFileName),
      path.join(this.cwd, this.bowerJSONFileName));
  },
  _backupBowerFile: function() {
    var copy = RSVP.denodeify(fs.copy);

    debug('Backup bower.json');

    return copy(path.join(this.cwd, this.bowerJSONFileName),
      path.join(this.cwd, this.bowerJSONBackupFileName));
  },
  _findBowerPath: function() {
    var adapter = this;
    return findEmberPath(adapter.cwd)
      .then(function(emberPath) {
        /* Find bower's entry point module relative to
         ember-cli's entry point script */
        return adapter._resolveModule('bower', { basedir: path.dirname(emberPath) })
          .catch(function() {
            debug('Bower not found');
            return adapter._installBower();
          }).then(function() {
            return adapter._resolveModule('bower', { basedir: path.dirname(emberPath) });
          });
      })
      .then(function(bowerPath) {
        return path.join(bowerPath, '..', '..', 'bin', 'bower');
      });
  },
  _installBower: function() {
    var adapter = this;
    debug('Installing bower via npm');
    return adapter.run('npm', [].concat(['install', 'bower@^1.3.12']), { cwd: adapter.cwd });
  },
  _resolveModule: function(moduleName, options) {
    return resolve(moduleName, options);
  }
});
