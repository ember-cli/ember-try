'use strict';

var expect          = require('chai').expect;
var RSVP            = require('rsvp');
var fs              = require('fs-extra');
var path            = require('path');
var tmp             = require('tmp-sync');
var yaml            = require('js-yaml');
var fixturePackage  = require('../fixtures/package.json');
var YarnAdapter      = require('../../lib/dependency-manager-adapters/yarn');
var writeJSONFile   = require('../helpers/write-json-file');
var writeYamlFile   = require('../helpers/write-yaml-file');
var generateMockRun = require('../helpers/generate-mock-run');

var remove  = RSVP.denodeify(fs.remove);
var root    = process.cwd();
var tmproot = path.join(root, 'tmp');
var tmpdir;

describe('yarnAdapter', function() {
  beforeEach(function() {
    tmpdir = tmp.in(tmproot);
    process.chdir(tmpdir);
  });

  afterEach(function() {
    process.chdir(root);
    return remove(tmproot);
  });

  describe('#setup', function() {
    it('backs up the package.json, yarn.lock files and node_modules', function() {
      fs.mkdirSync('node_modules');
      writeJSONFile('node_modules/prove-it.json', {originalNodeModules: true});
      writeJSONFile('package.json', {originalPackageJSON: true});
      writeYamlFile('yarn.lock', {originalYarnLock: true});
      return new YarnAdapter({cwd: tmpdir}).setup().then(function() {
        assertFileContainsJSON('package.json.ember-try', {originalPackageJSON: true});
        assertYamlFileContainsJSON('yarn.lock.ember-try', {originalYarnLock: true});
        assertFileContainsJSON('.node_modules.ember-try/prove-it.json', {originalNodeModules: true});
      }).catch(function(err) {
        console.log(err);
        expect(true).to.equal(false, 'Error should not happen');
      });
    });
  });

  describe('#_install', function() {
    it('runs yarn', function() {
      writeJSONFile('package.json', fixturePackage);
      var runCount = 0;
      var stubbedRun = generateMockRun([{
        command: 'yarn install',
        callback: function(command, args, opts) {
          runCount++;
          expect(opts).to.have.property('cwd', tmpdir);
          return RSVP.resolve();
        }
      }], { allowPassthrough: false });

      return new YarnAdapter({cwd: tmpdir, run: stubbedRun})._install().then(function() {
        expect(runCount).to.equal(1, 'Runs only yarn install command');
      }).catch(function(err) {
        console.log(err);
        expect(true).to.equal(false, 'Error should not happen');
      });
    });

    it('uses managerOptions for yarn commands', function() {
      writeJSONFile('package.json', fixturePackage);
      var runCount = 0;
      var stubbedRun = generateMockRun([{
        command: 'yarn install --no-lockfile',
        callback: function() {
          runCount++;
          return RSVP.resolve();
        }
      }], { allowPassthrough: false });

      return new YarnAdapter({cwd: tmpdir, run: stubbedRun, managerOptions: ['--no-lockfile']})._install().then(function() {
        expect(runCount).to.equal(1, 'Runs yarn install command with managerOptions');
      }).catch(function(err) {
        console.log(err);
        expect(true).to.equal(false, 'Error should not happen');
      });
    });
  });

  describe('#_restore', function() {
    it('replaces the package.json and yarn.lock with the backed up versions', function() {
      writeJSONFile('package.json.ember-try', {originalPackageJSON: true});
      writeJSONFile('package.json', {originalPackageJSON: false});
      writeYamlFile('yarn.lock.ember-try', {originalYarnLock: true});
      writeYamlFile('yarn.lock', {originalYarnLock: false});
      fs.mkdirSync('.node_modules.ember-try');
      writeJSONFile('.node_modules.ember-try/prove-it.json', {originalNodeModules: true});
      return new YarnAdapter({cwd: tmpdir})._restore().then(function() {
        assertFileContainsJSON('package.json', {originalPackageJSON: true});
        assertYamlFileContainsJSON('yarn.lock', {originalYarnLock: true});
        assertFileContainsJSON('node_modules/prove-it.json', {originalNodeModules: true});
      }).catch(function(err) {
        console.log(err);
        expect(true).to.equal(false, 'Error should not happen');
      });
    });
  });

  describe('#_newJSONForDependencySet', function() {
    it('changes specified dependency versions', function() {
      var yarnAdapter = new YarnAdapter({cwd: tmpdir});
      var packageJSON = { devDependencies: { 'ember-feature-flags': '1.0.0' }, dependencies: { 'ember-cli-babel': '5.0.0'} };
      var depSet = { dependencies: { 'ember-cli-babel': '6.0.0' } };

      var resultJSON = yarnAdapter._newJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.dependencies['ember-cli-babel']).to.equal('6.0.0');
    });

    it('changes specified package.json dev dependency versions', function() {
      var yarnAdapter = new YarnAdapter({cwd: tmpdir});
      var packageJSON = { devDependencies: { 'ember-feature-flags': '1.0.0' }, dependencies: { 'ember-cli-babel': '5.0.0'} };
      var depSet = { devDependencies: { 'ember-feature-flags': '2.0.1' } };

      var resultJSON = yarnAdapter._newJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.devDependencies['ember-feature-flags']).to.equal('2.0.1');
    });

    it('changes specified package.json peer dependency versions', function() {
      var yarnAdapter = new YarnAdapter({cwd: tmpdir});
      var packageJSON = { peerDependencies: { 'ember-cli-babel': '5.0.0' } };
      var depSet = { peerDependencies: { 'ember-cli-babel': '4.0.0' } };

      var resultJSON = yarnAdapter._newJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.peerDependencies['ember-cli-babel']).to.equal('4.0.0');
    });

    it('can remove a package', function() {
      var yarnAdapter = new YarnAdapter({cwd: tmpdir});
      var packageJSON = { devDependencies: { 'ember-feature-flags': '1.0.0' } };
      var depSet = { devDependencies: { 'ember-feature-flags': null } };

      var resultJSON = yarnAdapter._newJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.devDependencies).to.not.have.property('ember-feature-flags');
    });
  });
});

function assertYamlFileContainsJSON(filename, expectedObj) {
  return assertFileContains(filename, yaml.dump(expectedObj));
}

function assertFileContainsJSON(filename, expectedObj) {
  return assertFileContains(filename, JSON.stringify(expectedObj, null, 2));
}

function assertFileContains(filename, expectedContents) {
  var regex = new RegExp(escapeForRegex(expectedContents) + '($|\\W)', 'gm');
  var actualContents = fs.readFileSync(path.join(tmpdir, filename), { encoding: 'utf-8' });
  var result = regex.test(actualContents);
  expect(result).to.equal(true, 'File ' + filename + ' is expected to contain ' + expectedContents);
}

function escapeForRegex(str) {
  return str.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
}
