'use strict';

var expect        = require('chai').expect;
var RSVP          = require('rsvp');
var fs            = require('fs-extra');
var path          = require('path');
var tmp           = require('tmp-sync');
var fixtureBower  = require('../fixtures/bower.json');
var BowerAdapter  = require('../../lib/dependency-manager-adapters/bower');
var writeJSONFile = require('../helpers/write-json-file');

var remove  = RSVP.denodeify(fs.remove);
var stat    = RSVP.denodeify(fs.stat);
var root    = process.cwd();
var tmproot = path.join(root, 'tmp');
var tmpdir;

describe('bowerAdapter', function() {
  beforeEach(function() {
    tmpdir = tmp.in(tmproot);
    process.chdir(tmpdir);
  });

  afterEach(function() {
    process.chdir(root);
    return remove(tmproot);
  });

  describe('#setup', function() {
    it('backs up the bower file', function() {
      writeJSONFile('bower.json', {originalBowerJSON: true});
      return new BowerAdapter({cwd: tmpdir}).setup().then(function() {
        assertFileContainsJSON('bower.json.ember-try', {originalBowerJSON: true});
      });
    });
  });

  describe('#_getDependencySetAccountingForDeprecatedTopLevelKeys', function() {

    it('accounts for legacy format', function() {
      var scenarioDepSet = {
        dependencies: {
          ember: 'components/ember#beta'
        },
        devDependencies: {
          'ember-data': '~2.2.0'
        },
        resolutions: {
          ember: 'beta'
        }
      };
      var results = new BowerAdapter({cwd: tmpdir})._getDependencySetAccountingForDeprecatedTopLevelKeys(scenarioDepSet);
      expect(results).to.eql(scenarioDepSet);
    });

    it('uses dep set from bower key if present', function() {
      var scenarioDepSet = {
        bower: {
          dependencies: {
            ember: 'components/ember#release'
          },
          devDependencies: {
            'ember-data': '~2.1.0'
          },
          resolutions: {
            ember: 'release'
          }
        },
        dependencies: {
          ember: 'components/ember#beta'
        },
        devDependencies: {
          'ember-data': '~2.2.0'
        },
        resolutions: {
          ember: 'beta'
        }
      };

      var results = new BowerAdapter({cwd: tmpdir})._getDependencySetAccountingForDeprecatedTopLevelKeys(scenarioDepSet);
      expect(results).to.eql(scenarioDepSet.bower);
    });
  });

  describe('#_install', function() {
    it('removes bower_components', function() {
      var stubbedRun = function() {
        return new RSVP.Promise(function(resolve) {
          resolve();
        });
      };

      fs.mkdirSync('bower_components');
      writeJSONFile('bower.json', fixtureBower);
      writeJSONFile('bower_components/this-should-be-obliterated.json', {removed: false});
      return new BowerAdapter({cwd: tmpdir, run: stubbedRun})._install().then(function() {
        return stat('bower_components/this-should-be-obliterated.json').then(function() {
          expect(true).to.equal(false);
        }, function(err) {
          expect(err.code).to.equal('ENOENT', 'File should not exist');
        });
      });
    });

    it('runs bower install', function() {
      writeJSONFile('bower.json', fixtureBower);
      var stubbedRun = function(command, args, opts) {
        expect(command).to.equal('node');
        expect(args[0]).to.match(/bower/);
        expect(args[1]).to.equal('install');
        expect(args[2]).to.equal('--config.interactive=false');
        expect(opts).to.have.property('cwd', tmpdir);
        return RSVP.resolve();
      };
      return new BowerAdapter({cwd: tmpdir, run: stubbedRun})._install();
    });

    it('runs bower install including managerOptions', function() {
      writeJSONFile('bower.json', fixtureBower);
      var stubbedRun = function(command, args) {
        expect(command).to.equal('node');
        expect(args[0]).to.match(/bower/);
        expect(args[1]).to.equal('install');
        expect(args[2]).to.equal('--config.interactive=false');
        expect(args[3]).to.equal('--verbose=true');
        expect(args[4]).to.equal('--allow-root=true');
        return RSVP.resolve();
      };
      return new BowerAdapter({cwd: tmpdir, run: stubbedRun, managerOptions: ['--verbose=true', '--allow-root=true']})._install();
    });
  });

  describe('#_restoreOriginalBowerFile', function() {
    it('replaces the bower.json with the backed up version', function() {
      writeJSONFile('bower.json.ember-try', {originalBowerJSON: true});
      writeJSONFile('bower.json', {originalBowerJSON: false});
      return new BowerAdapter({cwd: tmpdir})._restoreOriginalBowerFile().then(function() {
        assertFileContainsJSON('bower.json', {originalBowerJSON: true});
      });
    });
  });

  describe('#_bowerJSONForDependencySet', function() {
    it('changes specified bower dependency versions', function() {
      var bowerAdapter = new BowerAdapter({cwd: tmpdir});
      var bowerJSON = { dependencies: { jquery: '1.11.1' }, resolutions: {} };
      var depSet =  { dependencies: { jquery: '2.1.3' } };

      var resultJSON = bowerAdapter._bowerJSONForDependencySet(bowerJSON, depSet);

      expect(resultJSON.dependencies.jquery).to.equal('2.1.3');
    });

    it('changes specified bower dev dependency versions', function() {
      var bowerAdapter = new BowerAdapter({cwd: tmpdir});
      var bowerJSON = { devDependencies: { jquery: '1.11.1' }, resolutions: {} };
      var depSet =  { devDependencies: { jquery: '2.1.3' } };

      var resultJSON = bowerAdapter._bowerJSONForDependencySet(bowerJSON, depSet);

      expect(resultJSON.devDependencies.jquery).to.equal('2.1.3');
    });

    it('adds to resolutions', function() {
      var bowerAdapter = new BowerAdapter({cwd: tmpdir});
      var bowerJSON = { dependencies: { jquery: '1.11.1' }, resolutions: {} };
      var depSet =  { dependencies: { jquery: '2.1.3' } };

      var resultJSON = bowerAdapter._bowerJSONForDependencySet(bowerJSON, depSet);

      expect(resultJSON.resolutions.jquery).to.equal('2.1.3');
    });

    it('sets custom resolutions', function() {
      var bowerAdapter = new BowerAdapter({cwd: tmpdir});
      var bowerJSON = { dependencies: { ember: '1.13.5' }, resolutions: {} };
      var depSet =  {
        dependencies: { ember: 'components/ember#canary' },
        resolutions:  { ember: 'canary' }
      };

      var resultJSON = bowerAdapter._bowerJSONForDependencySet(bowerJSON, depSet);

      expect(resultJSON.resolutions.ember).to.equal('canary');
    });

    it('handles lack of resolutions in original bower.json', function() {
      var bowerAdapter = new BowerAdapter({cwd: tmpdir});
      var bowerJSON = { dependencies: { jquery: '1.11.1' } };
      var depSet =  { dependencies: { jquery: '2.1.3' } };

      var resultJSON = bowerAdapter._bowerJSONForDependencySet(bowerJSON, depSet);

      expect(resultJSON.resolutions.jquery).to.equal('2.1.3');
    });
  });

  describe('#_findBowerPath()', function() {
    it('returns the correct bower path', function() {
      return new BowerAdapter({cwd: tmpdir})._findBowerPath().then(function(path) {
        expect(path).to.include('node_modules/bower/bin/bower');
      }).catch(function(err) {
        console.log(err);
        expect(true).to.equal(false, 'Error should not happen');
      });
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
