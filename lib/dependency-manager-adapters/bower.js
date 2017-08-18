'use strict';

let CoreObject = require('core-object');
let fs = require('fs-extra');
let RSVP = require('rsvp');
let path = require('path');
let extend = require('extend');
let debug = require('debug')('ember-try:dependency-manager-adapter:bower');
let rimraf = RSVP.denodeify(require('rimraf'));
let resolve = RSVP.denodeify(require('resolve'));
let findEmberPath = require('../utils/find-ember-path');

module.exports = CoreObject.extend({
  init() {
    this._super.apply(this, arguments);
    this.run = this.run || require('../utils/run');
    this.hasBowerFileInitially = fs.existsSync(path.join(this.cwd, this.bowerJSONFileName));
  },
  bowerJSONFileName: 'bower.json',
  bowerJSONBackupFileName: 'bower.json.ember-try',
  defaultBowerJSON: {
    name: 'ember-try-placeholder',
    dependencies: {},
  },
  configKey: 'bower',
  setup() {
    if (this.hasBowerFileInitially) {
      return this._backupBowerFile();
    } else {
      return RSVP.resolve();
    }
  },
  _getDependencySetAccountingForDeprecatedTopLevelKeys(depSet) {
    if (depSet[this.configKey]) {
      return depSet[this.configKey];
    }
    return { dependencies: depSet.dependencies, devDependencies: depSet.devDependencies, resolutions: depSet.resolutions };
  },
  _writeBowerFileWithDepSetChanges(depSet) {
    let adapter = this;
    let baseBowerJSON;
    let bowerFile = path.join(adapter.cwd, adapter.bowerJSONFileName);

    if (this.hasBowerFileInitially) {
      let backupBowerFile = path.join(adapter.cwd, adapter.bowerJSONBackupFileName);
      baseBowerJSON = JSON.parse(fs.readFileSync(backupBowerFile));
    } else {
      baseBowerJSON = this.defaultBowerJSON;
    }

    let newBowerJSON = adapter._bowerJSONForDependencySet(baseBowerJSON, depSet);

    debug('Write bower.json with: \n', JSON.stringify(newBowerJSON));

    fs.writeFileSync(bowerFile, JSON.stringify(newBowerJSON, null, 2));
  },
  changeToDependencySet(depSet) {
    let adapter = this;
    depSet = this._getDependencySetAccountingForDeprecatedTopLevelKeys(depSet);

    debug('Changing to dependency set: %s', JSON.stringify(depSet));

    if (!depSet) { return RSVP.resolve([]); }

    adapter._writeBowerFileWithDepSetChanges(depSet);

    return adapter._install().then(() => {
      let deps = extend({}, depSet.dependencies || {}, depSet.devDependencies || {});
      let currentDeps = Object.keys(deps).map((dep) => {
        return {
          name: dep,
          versionExpected: deps[dep],
          versionSeen: adapter._findCurrentVersionOf(dep),
          packageManager: 'bower',
        };
      });

      debug('Switched to dependencies: \n', currentDeps);

      return RSVP.Promise.resolve(currentDeps);
    });
  },
  cleanup() {
    let adapter = this;
    if (this.hasBowerFileInitially) {
      return adapter._restoreOriginalBowerFile().then(() => {
        debug('Remove backup bower.json');
        return rimraf(path.join(adapter.cwd, adapter.bowerJSONBackupFileName));
      }).catch((e) => {
        console.log('Error cleaning up bower scenario:', e);
      })
        .then(() => {
          return adapter._install();
        });
    } else {
      return rimraf(path.join(adapter.cwd, adapter.bowerJSONFileName)).then(() => {
        return rimraf(path.join(adapter.cwd, 'bower_components'));
      });
    }
  },
  _findCurrentVersionOf(packageName) {
    let filename = path.join(this.cwd, 'bower_components', packageName, 'bower.json');
    if (fs.existsSync(filename)) {
      return JSON.parse(fs.readFileSync(filename)).version;
    } else {
      return null;
    }
  },
  _install() {
    let adapter = this;
    let options = this.managerOptions || [];

    return rimraf(path.join(adapter.cwd, 'bower_components'))
      .then(() => {
        debug('Remove bower_components');
        return adapter._findBowerPath(adapter.cwd);
      })
      .then((bowerPath) => {
        debug('Run bower install using bower at %s', bowerPath);
        return adapter.run('node', [].concat([bowerPath, 'install', '--config.interactive=false'], options), { cwd: adapter.cwd });
      });
  },
  _bowerJSONForDependencySet(bowerJSON, depSet) {
    if (!bowerJSON.resolutions) {
      bowerJSON.resolutions = {};
    }

    this._overrideBowerJSONDependencies(bowerJSON, depSet, 'dependencies');
    this._overrideBowerJSONDependencies(bowerJSON, depSet, 'devDependencies');

    return bowerJSON;
  },
  _overrideBowerJSONDependencies(bowerJSON, depSet, kindOfDependency) {
    if (!depSet[kindOfDependency]) { return; }
    let pkgs = Object.keys(depSet[kindOfDependency]);

    pkgs.forEach((pkg) => {
      if (!bowerJSON[kindOfDependency]) {
        bowerJSON[kindOfDependency] = {};
      }

      let version = depSet[kindOfDependency][pkg];
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
  _restoreOriginalBowerFile() {
    let copy = RSVP.denodeify(fs.copy);

    debug('Restore original bower.json');

    return copy(path.join(this.cwd, this.bowerJSONBackupFileName),
      path.join(this.cwd, this.bowerJSONFileName));
  },
  _backupBowerFile() {
    let copy = RSVP.denodeify(fs.copy);

    debug('Backup bower.json');

    return copy(path.join(this.cwd, this.bowerJSONFileName),
      path.join(this.cwd, this.bowerJSONBackupFileName));
  },
  _findBowerPath() {
    let adapter = this;
    return findEmberPath(adapter.cwd)
      .then((emberPath) => {
        /* Find bower's entry point module relative to
         ember-cli's entry point script */
        return adapter._resolveModule('bower', { basedir: path.dirname(emberPath) })
          .catch(() => {
            debug('Bower not found');
            return adapter._installBower();
          }).then(() => {
            return adapter._resolveModule('bower', { basedir: path.dirname(emberPath) });
          });
      })
      .then((bowerPath) => {
        return path.join(bowerPath, '..', '..', 'bin', 'bower');
      });
  },
  _installBower() {
    let adapter = this;
    debug('Installing bower via npm');
    return adapter.run('npm', [].concat(['install', 'bower@^1.3.12']), { cwd: adapter.cwd });
  },
  _resolveModule(moduleName, options) {
    return resolve(moduleName, options);
  },
});
