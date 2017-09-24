'use strict';

let expect = require('chai').expect;
let RSVP = require('rsvp');
let fs = require('fs-extra');
let path = require('path');
let tmp = require('tmp-sync');
let fixtureBower = require('../fixtures/bower.json');
let BowerAdapter = require('../../lib/dependency-manager-adapters/bower');
let writeJSONFile = require('../helpers/write-json-file');

let remove = RSVP.denodeify(fs.remove);
let stat = RSVP.denodeify(fs.stat);
let root = process.cwd();
let tmproot = path.join(root, 'tmp');
let tmpdir;

describe('bowerAdapter', () => {
  beforeEach(() => {
    tmpdir = tmp.in(tmproot);
    process.chdir(tmpdir);
  });

  afterEach(() => {
    process.chdir(root);
    return remove(tmproot);
  });

  describe('#setup', () => {
    it('backs up the bower file', () => {
      writeJSONFile('bower.json', { originalBowerJSON: true });
      return new BowerAdapter({ cwd: tmpdir }).setup().then(() => {
        assertFileContainsJSON('bower.json.ember-try', { originalBowerJSON: true });
      });
    });

    it('does not error if no bower.json', () => {
      return new BowerAdapter({ cwd: tmpdir }).setup().catch(() => {
        expect(true).to.eql(false);
      });
    });
  });

  describe('#_getDependencySetAccountingForDeprecatedTopLevelKeys', () => {

    it('accounts for legacy format', () => {
      let scenarioDepSet = {
        dependencies: {
          ember: 'components/ember#beta',
        },
        devDependencies: {
          'ember-data': '~2.2.0',
        },
        resolutions: {
          ember: 'beta',
        },
      };
      let results = new BowerAdapter({ cwd: tmpdir })._getDependencySetAccountingForDeprecatedTopLevelKeys(scenarioDepSet);
      expect(results).to.eql(scenarioDepSet);
    });

    it('uses dep set from bower key if present', () => {
      let scenarioDepSet = {
        bower: {
          dependencies: {
            ember: 'components/ember#release',
          },
          devDependencies: {
            'ember-data': '~2.1.0',
          },
          resolutions: {
            ember: 'release',
          },
        },
        dependencies: {
          ember: 'components/ember#beta',
        },
        devDependencies: {
          'ember-data': '~2.2.0',
        },
        resolutions: {
          ember: 'beta',
        },
      };

      let results = new BowerAdapter({ cwd: tmpdir })._getDependencySetAccountingForDeprecatedTopLevelKeys(scenarioDepSet);
      expect(results).to.eql(scenarioDepSet.bower);
    });
  });

  describe('#_install', () => {
    it('removes bower_components', () => {
      let stubbedRun = function() {
        return new RSVP.Promise(((resolve) => {
          resolve();
        }));
      };

      fs.mkdirSync('bower_components');
      writeJSONFile('bower.json', fixtureBower);
      writeJSONFile('bower_components/this-should-be-obliterated.json', { removed: false });
      return new BowerAdapter({ cwd: tmpdir, run: stubbedRun })._install().then(() => {
        return stat('bower_components/this-should-be-obliterated.json').then(() => {
          expect(true).to.equal(false);
        }, (err) => {
          expect(err.code).to.equal('ENOENT', 'File should not exist');
        });
      });
    });

    it('runs bower install', () => {
      writeJSONFile('bower.json', fixtureBower);
      let stubbedRun = function(command, args, opts) {
        expect(command).to.equal('node');
        expect(args[0]).to.match(/bower/);
        expect(args[1]).to.equal('install');
        expect(args[2]).to.equal('--config.interactive=false');
        expect(opts).to.have.property('cwd', tmpdir);
        return RSVP.resolve();
      };
      return new BowerAdapter({ cwd: tmpdir, run: stubbedRun })._install();
    });

    it('runs bower install including managerOptions', () => {
      writeJSONFile('bower.json', fixtureBower);
      let stubbedRun = function(command, args) {
        expect(command).to.equal('node');
        expect(args[0]).to.match(/bower/);
        expect(args[1]).to.equal('install');
        expect(args[2]).to.equal('--config.interactive=false');
        expect(args[3]).to.equal('--verbose=true');
        expect(args[4]).to.equal('--allow-root=true');
        return RSVP.resolve();
      };
      return new BowerAdapter({ cwd: tmpdir, run: stubbedRun, managerOptions: ['--verbose=true', '--allow-root=true'] })._install();
    });
  });

  describe('#_restoreOriginalBowerFile', () => {
    it('replaces the bower.json with the backed up version', () => {
      writeJSONFile('bower.json.ember-try', { originalBowerJSON: true });
      writeJSONFile('bower.json', { originalBowerJSON: false });
      return new BowerAdapter({ cwd: tmpdir })._restoreOriginalBowerFile().then(() => {
        assertFileContainsJSON('bower.json', { originalBowerJSON: true });
      });
    });
  });

  describe('#_writeBowerFileWithDepSetChanges', () => {
    it('writes bower.json with dep set changes', () => {
      let bowerJSON = { dependencies: { jquery: '1.11.1' }, resolutions: {} };
      let depSet = { dependencies: { jquery: '2.1.3' } };
      writeJSONFile('bower.json', bowerJSON);
      writeJSONFile('bower.json.ember-try', bowerJSON);

      new BowerAdapter({ cwd: tmpdir })._writeBowerFileWithDepSetChanges(depSet);
      assertFileContainsJSON('bower.json', {
        dependencies: {
          jquery: '2.1.3',
        },
        resolutions: {
          jquery: '2.1.3',
        },
      });
    });

    it('writes bower.json with dep set changes even if no original bower.json', () => {
      let depSet = { dependencies: { jquery: '2.1.3' } };

      new BowerAdapter({ cwd: tmpdir })._writeBowerFileWithDepSetChanges(depSet);
      assertFileContainsJSON('bower.json', {
        name: 'ember-try-placeholder',
        dependencies: {
          jquery: '2.1.3',
        },
        resolutions: {
          jquery: '2.1.3',
        },
      });
    });
  });

  describe('#_bowerJSONForDependencySet', () => {
    it('changes specified bower dependency versions', () => {
      let bowerAdapter = new BowerAdapter({ cwd: tmpdir });
      let bowerJSON = { dependencies: { jquery: '1.11.1' }, resolutions: {} };
      let depSet = { dependencies: { jquery: '2.1.3' } };

      let resultJSON = bowerAdapter._bowerJSONForDependencySet(bowerJSON, depSet);

      expect(resultJSON.dependencies.jquery).to.equal('2.1.3');
    });

    it('changes specified bower dev dependency versions', () => {
      let bowerAdapter = new BowerAdapter({ cwd: tmpdir });
      let bowerJSON = { devDependencies: { jquery: '1.11.1' }, resolutions: {} };
      let depSet = { devDependencies: { jquery: '2.1.3' } };

      let resultJSON = bowerAdapter._bowerJSONForDependencySet(bowerJSON, depSet);

      expect(resultJSON.devDependencies.jquery).to.equal('2.1.3');
    });

    it('adds to resolutions', () => {
      let bowerAdapter = new BowerAdapter({ cwd: tmpdir });
      let bowerJSON = { dependencies: { jquery: '1.11.1' }, resolutions: {} };
      let depSet = { dependencies: { jquery: '2.1.3' } };

      let resultJSON = bowerAdapter._bowerJSONForDependencySet(bowerJSON, depSet);

      expect(resultJSON.resolutions.jquery).to.equal('2.1.3');
    });

    it('sets custom resolutions', () => {
      let bowerAdapter = new BowerAdapter({ cwd: tmpdir });
      let bowerJSON = { dependencies: { ember: '1.13.5' }, resolutions: {} };
      let depSet = {
        dependencies: { ember: 'components/ember#canary' },
        resolutions: { ember: 'canary' },
      };

      let resultJSON = bowerAdapter._bowerJSONForDependencySet(bowerJSON, depSet);

      expect(resultJSON.resolutions.ember).to.equal('canary');
    });

    it('handles lack of resolutions in original bower.json', () => {
      let bowerAdapter = new BowerAdapter({ cwd: tmpdir });
      let bowerJSON = { dependencies: { jquery: '1.11.1' } };
      let depSet = { dependencies: { jquery: '2.1.3' } };

      let resultJSON = bowerAdapter._bowerJSONForDependencySet(bowerJSON, depSet);

      expect(resultJSON.resolutions.jquery).to.equal('2.1.3');
    });

    it('can remove a package', () => {
      let bowerAdapter = new BowerAdapter({ cwd: tmpdir });
      let bowerJSON = { dependencies: { jquery: '1.11.1' }, resolutions: { jquery: '1.11.1' } };
      let depSet = { dependencies: { jquery: null } };

      let resultJSON = bowerAdapter._bowerJSONForDependencySet(bowerJSON, depSet);

      expect(resultJSON.dependencies).to.not.have.property('jquery');
      expect(resultJSON.resolutions).to.not.have.property('jquery');
    });
  });

  describe('#_findBowerPath()', () => {
    it('returns the correct bower path', () => {
      return new BowerAdapter({ cwd: tmpdir })._findBowerPath().then((path) => {
        expect(path).to.include('node_modules/bower/bin/bower');
      });
    });

    it('does not attempt to install bower if bower is found', () => {
      let installCount = 0;
      let stubbedResolveModule = function() {
        return RSVP.resolve('blip/bloop/foo/lib/index.js');
      };
      let stubbedInstallBower = function() {
        installCount++;
      };
      return new BowerAdapter({ cwd: tmpdir, _installBower: stubbedInstallBower, _resolveModule: stubbedResolveModule })._findBowerPath().then((path) => {
        expect(path).to.include('blip/bloop/foo/bin/bower');
        expect(installCount).to.equal(0);
      });
    });

    it('installs bower if bower is not found', () => {
      let installCount = 0;
      let resolveModuleCount = 0;
      let stubbedResolveModule = function() {
        resolveModuleCount++;
        if (resolveModuleCount === 1) {
          return RSVP.reject();
        }
        if (resolveModuleCount === 2) {
          return RSVP.resolve('flip/flop/gloop/lib/index.js');
        }
      };

      let stubbedInstallBower = function() {
        installCount++;
      };

      return new BowerAdapter({ cwd: tmpdir, _installBower: stubbedInstallBower, _resolveModule: stubbedResolveModule })._findBowerPath().then((path) => {
        expect(path).to.include('flip/flop/gloop/bin/bower');
        expect(installCount).to.equal(1);
      });
    });
  });

  describe('#_installBower()', () => {
    it('installs bower via npm', () => {
      let command, args, opts;
      let stubbedRun = function(c, a, o) {
        command = c;
        args = a;
        opts = o;
        return RSVP.resolve();
      };
      return new BowerAdapter({ cwd: tmpdir, run: stubbedRun })._installBower().then(() => {
        expect(command).to.equal('npm');
        expect(args[0]).to.equal('install');
        expect(args[1]).to.equal('bower@^1.3.12');
        expect(opts).to.have.property('cwd', tmpdir);
      });
    });
  });
});

function assertFileContainsJSON(filename, expectedObj) {
  return assertFileContains(filename, JSON.stringify(expectedObj, null, 2));
}

function assertFileContains(filename, expectedContents) {
  let regex = new RegExp(`${escapeForRegex(expectedContents)}($|\\W)`, 'gm');
  let actualContents = fs.readFileSync(path.join(tmpdir, filename), { encoding: 'utf-8' });
  let result = regex.test(actualContents);
  expect(result).to.equal(true, `File ${filename} is expected to contain ${expectedContents} but contained ${actualContents}`);
}

function escapeForRegex(str) {
  return str.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
}
