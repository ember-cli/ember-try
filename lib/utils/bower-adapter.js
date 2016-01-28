var CoreObject    = require('core-object');
var fs            = require('fs-extra');
var RSVP          = require('rsvp');
var path          = require('path');
var findEmberPath = require('./find-ember-path');
var extend        = require('extend');
var rimraf        = RSVP.denodeify(require('rimraf'));
var resolve       = RSVP.denodeify(require('resolve'));


module.exports = CoreObject.extend({
  init: function() {
    this._super.apply(this, arguments);
    this.run = this.run || require('./run');
  },
  bowerJSONFileName: 'bower.json',
  bowerJSONBackupFileName: 'bower.json.ember-try',
  configKey: 'bower',
  setup: function() {
    return this._backupBowerFile();
  },
  _getDependencySetAccountingForDeprecatedTopLevelKeys: function(depSet) {
    if (depSet[this.configKey]) {
      return depSet[this.configKey];
    }
    return {dependencies: depSet.dependencies, devDependencies: depSet.devDependencies, resolutions: depSet.resolutions};
  },
  changeToDependencySet: function(depSet) {
    var adapter = this;
    depSet = this._getDependencySetAccountingForDeprecatedTopLevelKeys(depSet);
    if (!depSet) { return RSVP.resolve([]); }
    var backupBowerFile = path.join(adapter.cwd, adapter.bowerJSONBackupFileName);
    var bowerFile = path.join(adapter.cwd, adapter.bowerJSONFileName);
    var bowerJSON = JSON.parse(fs.readFileSync(backupBowerFile));
    var newBowerJSON = adapter._bowerJSONForDependencySet(bowerJSON, depSet);

    fs.writeFileSync(bowerFile, JSON.stringify(newBowerJSON, null, 2));
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
      return RSVP.Promise.resolve(currentDeps);
    });
  },
  cleanup: function() {
    var adapter = this;
    return adapter._restoreOriginalBowerFile().then(function() {
      return rimraf(path.join(adapter.cwd, adapter.bowerJSONBackupFileName));
    }).catch(function(e) {
      console.log('Error cleaning up bower scenario:', e);
    })
    .then(function() {
      return adapter._install();
    });
  },
  _findCurrentVersionOf: function(packageName) {
    var filename = path.join(this.cwd, 'bower_components', packageName, 'bower.json');
    if (fs.existsSync(filename)) {
      return JSON.parse(fs.readFileSync(filename)).version;
    } else {
      throw 'File ' + filename + ' does not exist';
    }
  },
  _install: function() {
    var adapter = this;

    return rimraf(path.join(adapter.cwd, 'bower_components'))
      .then(function() {
        return adapter._findBowerPath(adapter.cwd);
      })
      .then(function(bowerPath) {
        return adapter.run('node', [bowerPath, 'install', '--config.interactive=false'], {cwd: adapter.cwd});
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
      bowerJSON[kindOfDependency][pkg] = depSet[kindOfDependency][pkg];

      if (depSet.resolutions && depSet.resolutions[pkg]) {
        bowerJSON.resolutions[pkg] = depSet.resolutions[pkg];
      } else {
        bowerJSON.resolutions[pkg] = depSet[kindOfDependency][pkg];
      }
    });
  },
  _restoreOriginalBowerFile: function() {
    var copy = RSVP.denodeify(fs.copy);
    return copy(path.join(this.cwd, this.bowerJSONBackupFileName),
      path.join(this.cwd, this.bowerJSONFileName));
  },
  _backupBowerFile: function() {
    var copy = RSVP.denodeify(fs.copy);
    return copy(path.join(this.cwd, this.bowerJSONFileName),
      path.join(this.cwd, this.bowerJSONBackupFileName));
  },
  _findBowerPath: function() {
    return findEmberPath(this.cwd)
      .then(function(emberPath) {
        /* Find bower's entry point module relative to
         ember-cli's entry point script */
        return resolve('bower', { basedir: path.dirname(emberPath) });
      })
      .then(function(bowerPath) {
        return path.join(bowerPath, '..', '..', 'bin', 'bower');
      });
  }
});
