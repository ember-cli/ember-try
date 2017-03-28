'use strict';

var expect = require('chai').expect;
var RSVP = require('rsvp');
var fs = require('fs-extra');
var path = require('path');
var tmp = require('tmp-sync');
var fixturePackage = require('../fixtures/package.json');
var NpmAdapter = require('../../lib/dependency-manager-adapters/npm');
var writeJSONFile = require('../helpers/write-json-file');
var generateMockRun = require('../helpers/generate-mock-run');

var remove = RSVP.denodeify(fs.remove);
var root = process.cwd();
var tmproot = path.join(root, 'tmp');
var tmpdir;

var failedYarnCheck = function() {
  throw new Error('Yarn not available');
};

var passedYarnCheck = function() {};

describe('npmAdapter', function() {
  beforeEach(function() {
    tmpdir = tmp.in(tmproot);
    process.chdir(tmpdir);
  });

  afterEach(function() {
    process.chdir(root);
    return remove(tmproot);
  });

  describe('#setup', function() {
    it('backs up the package.json file and node_modules', function() {
      fs.mkdirSync('node_modules');
      writeJSONFile('node_modules/prove-it.json', { originalNodeModules: true });
      writeJSONFile('package.json', { originalPackageJSON: true });
      return new NpmAdapter({
        cwd: tmpdir,
        _runYarnCheck: failedYarnCheck
      }).setup().then(function() {
        assertFileContainsJSON('package.json.ember-try', { originalPackageJSON: true });
        assertFileContainsJSON('.node_modules.ember-try/prove-it.json', { originalNodeModules: true });
      }).catch(function(err) {
        console.log(err);
        expect(true).to.equal(false, 'Error should not happen');
      });
    });
  });

  describe('#_install', function() {
    describe('without yarn', function() {
      it('runs npm prune and npm install', function() {
        writeJSONFile('package.json', fixturePackage);
        var runCount = 0;
        var stubbedRun = generateMockRun([{
          command: 'npm install',
          callback: function(command, args, opts) {
            runCount++;
            expect(opts).to.have.property('cwd', tmpdir);
            return RSVP.resolve();
          }
        }, {
          command: 'npm prune',
          callback: function(command, args, opts) {
            runCount++;
            expect(opts).to.have.property('cwd', tmpdir);
            return RSVP.resolve();
          }
        }], { allowPassthrough: false });

        return new NpmAdapter({
          cwd: tmpdir,
          run: stubbedRun,
          _runYarnCheck: failedYarnCheck
        })._install().then(function() {
          expect(runCount).to.equal(2, 'Both commands should run');
        }).catch(function(err) {
          console.log(err);
          expect(true).to.equal(false, 'Error should not happen');
        });
      });

      it('uses managerOptions for npm commands', function() {
        writeJSONFile('package.json', fixturePackage);
        var runCount = 0;
        var stubbedRun = generateMockRun([{
          command: 'npm install --no-shrinkwrap=true',
          callback: function() {
            runCount++;
            return RSVP.resolve();
          }
        }, {
          command: 'npm prune --no-shrinkwrap=true',
          callback: function() {
            runCount++;
            return RSVP.resolve();
          }
        }], { allowPassthrough: false });

        return new NpmAdapter({
          cwd: tmpdir,
          run: stubbedRun,
          _runYarnCheck: failedYarnCheck,
          managerOptions: ['--no-shrinkwrap=true']
        })._install().then(function() {
          expect(runCount).to.equal(2, 'Both commands should run');
        }).catch(function(err) {
          console.log(err);
          expect(true).to.equal(false, 'Error should not happen');
        });
      });
    });
    describe('with yarn', function() {
      it('runs yarn install', function() {
        writeJSONFile('package.json', fixturePackage);
        var runCount = 0;
        var stubbedRun = generateMockRun([{
          command: 'yarn install --no-lockfile',
          callback: function(command, args, opts) {
            runCount++;
            expect(opts).to.have.property('cwd', tmpdir);
            return RSVP.resolve();
          }
        }], { allowPassthrough: false });

        return new NpmAdapter({
          cwd: tmpdir,
          run: stubbedRun,
          _runYarnCheck: passedYarnCheck
        })._install().then(function() {
          expect(runCount).to.equal(1, 'Only yarn install should run');
        });
      });

      it('uses managerOptions for yarn commands', function() {
        writeJSONFile('package.json', fixturePackage);
        var runCount = 0;
        var stubbedRun = generateMockRun([{
          command: 'yarn install --flat --no-lockfile',
          callback: function() {
            runCount++;
            return RSVP.resolve();
          }
        }], { allowPassthrough: false });

        return new NpmAdapter({
          cwd: tmpdir,
          run: stubbedRun,
          _runYarnCheck: passedYarnCheck,
          managerOptions: ['--flat']
        })._install().then(function() {
          expect(runCount).to.equal(1, 'Only yarn install should run with manager options');
        });
      });
    });
  });

  describe('#_restoreOriginalDependencies', function() {
    it('replaces the package.json with the backed up version', function() {
      writeJSONFile('package.json.ember-try', { originalPackageJSON: true });
      writeJSONFile('package.json', { originalPackageJSON: false });
      fs.mkdirSync('.node_modules.ember-try');
      writeJSONFile('.node_modules.ember-try/prove-it.json', { originalNodeModules: true });
      return new NpmAdapter({ cwd: tmpdir })._restoreOriginalDependencies().then(function() {
        assertFileContainsJSON('package.json', { originalPackageJSON: true });
        assertFileContainsJSON('node_modules/prove-it.json', { originalNodeModules: true });
      }).catch(function(err) {
        console.log(err);
        expect(true).to.equal(false, 'Error should not happen');
      });
    });
  });

  describe('#_packageJSONForDependencySet', function() {
    it('changes specified dependency versions', function() {
      var npmAdapter = new NpmAdapter({ cwd: tmpdir });
      var packageJSON = { devDependencies: { 'ember-feature-flags': '1.0.0' }, dependencies: { 'ember-cli-babel': '5.0.0' } };
      var depSet = { dependencies: { 'ember-cli-babel': '6.0.0' } };

      var resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.dependencies['ember-cli-babel']).to.equal('6.0.0');
    });

    it('changes specified npm dev dependency versions', function() {
      var npmAdapter = new NpmAdapter({ cwd: tmpdir });
      var packageJSON = { devDependencies: { 'ember-feature-flags': '1.0.0' }, dependencies: { 'ember-cli-babel': '5.0.0' } };
      var depSet = { devDependencies: { 'ember-feature-flags': '2.0.1' } };

      var resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.devDependencies['ember-feature-flags']).to.equal('2.0.1');
    });

    it('changes specified npm peer dependency versions', function() {
      var npmAdapter = new NpmAdapter({ cwd: tmpdir });
      var packageJSON = { peerDependencies: { 'ember-cli-babel': '5.0.0' } };
      var depSet = { peerDependencies: { 'ember-cli-babel': '4.0.0' } };

      var resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.peerDependencies['ember-cli-babel']).to.equal('4.0.0');
    });

    it('can remove a package', function() {
      var npmAdapter = new NpmAdapter({ cwd: tmpdir });
      var packageJSON = { devDependencies: { 'ember-feature-flags': '1.0.0' } };
      var depSet = { devDependencies: { 'ember-feature-flags': null } };

      var resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.devDependencies).to.not.have.property('ember-feature-flags');
    });
  });

  describe('#_setYarnAvailability', function() {
    it('sets useYarnCommand to true if yarn check does not raise', function() {
      var npmAdapter = new NpmAdapter({
        cwd: tmpdir,
        _runYarnCheck: function() {}
      });

      npmAdapter._setYarnAvailability();

      expect(npmAdapter.useYarnCommand).to.equal(true);
    });

    it('sets useYarnCommand to false if yarn check raises', function() {
      var npmAdapter = new NpmAdapter({
        cwd: tmpdir,
        _runYarnCheck: function() {
          throw new Error();
        }
      });

      npmAdapter._setYarnAvailability();

      expect(npmAdapter.useYarnCommand).to.equal(false);
    });
  });
});

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
