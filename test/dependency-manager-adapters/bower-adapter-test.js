'use strict';

let expect = require('chai').expect;
let RSVP = require('rsvp');
let fs = require('fs-extra');
let path = require('path');
let tmp = require('tmp-sync');
let fixtureBower = require('../fixtures/bower.json');
let BowerAdapter = require('../../lib/dependency-manager-adapters/bower');
let writeJSONFile = require('../helpers/write-json-file');
let assertFileContainsJSON = require('../helpers/assert-file-contains-json');

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
        assertFileContainsJSON(path.join(tmpdir, 'bower.json.ember-try'), { originalBowerJSON: true });
      });
    });

    it('does not error if no bower.json', () => {
      return new BowerAdapter({ cwd: tmpdir }).setup();
    });
  });

  describe('#changeToDependencySet', () => {
    it('if there are no bower dependencies, nothing is done', () => {
      let stubbedRun = function() {
        throw new Error('Should not run anything');
      };

      let adapter = new BowerAdapter({ cwd: tmpdir, run: stubbedRun });

      return adapter.setup()
        .then(() => {
          return adapter.changeToDependencySet({ });
        })
        .then(() => {
          return adapter.cleanup();
        });
    });

    it('if bower dependencies in dep set, they install is run', () => {
      let stubbedRunRan = false;
      let stubbedRun = function(command, args, opts) {
        expect(command).to.equal('node');
        expect(args[0]).to.match(/bower/);
        expect(args[1]).to.equal('install');
        expect(args[2]).to.equal('--config.interactive=false');
        expect(opts).to.have.property('cwd', tmpdir);
        stubbedRunRan = true;
        return RSVP.resolve();
      };

      let adapter = new BowerAdapter({ cwd: tmpdir, run: stubbedRun });
      return adapter.setup()
        .then(() => {
          return adapter.changeToDependencySet({ bower: { dependencies: { 'ember': '*' } } });
        })
        .then(() => {
          expect(stubbedRunRan).to.equal(true);
          return adapter.cleanup();
        });
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

    it('rejects if local bower is not found', () => {
      let doNotFindLocalBower = function() {
        return RSVP.reject('no local bower found');
      };

      let stubbedRun = function() {
        return RSVP.reject();
      };

      return new BowerAdapter({
        cwd: tmpdir,
        _findBowerPath: doNotFindLocalBower,
        run: stubbedRun,
      })._install().then(() => {
        expect.fail(true, false, 'unreachable: _install promise rejects');
      }, (error) => {
        expect(error).to.equal('no local bower found');
      });
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
        assertFileContainsJSON(path.join(tmpdir, 'bower.json'), { originalBowerJSON: true });
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

      assertFileContainsJSON(path.join(tmpdir, 'bower.json'), {
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
      assertFileContainsJSON(path.join(tmpdir, 'bower.json'), {
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
  });
});
