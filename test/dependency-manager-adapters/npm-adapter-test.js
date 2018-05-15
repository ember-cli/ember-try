'use strict';

let expect = require('chai').expect;
let RSVP = require('rsvp');
let fs = require('fs-extra');
let path = require('path');
let tmp = require('tmp-sync');
let fixturePackage = require('../fixtures/package.json');
let NpmAdapter = require('../../lib/dependency-manager-adapters/npm');
let writeJSONFile = require('../helpers/write-json-file');
let generateMockRun = require('../helpers/generate-mock-run');

let remove = RSVP.denodeify(fs.remove);
let root = process.cwd();
let tmproot = path.join(root, 'tmp');
let tmpdir;

describe('npmAdapter', () => {
  beforeEach(() => {
    tmpdir = tmp.in(tmproot);
    process.chdir(tmpdir);
  });

  afterEach(() => {
    process.chdir(root);
    return remove(tmproot);
  });

  describe('#setup', () => {
    it('backs up the package.json file and node_modules', () => {
      fs.mkdirSync('node_modules');
      writeJSONFile('node_modules/prove-it.json', { originalNodeModules: true });
      writeJSONFile('package.json', { originalPackageJSON: true });
      return new NpmAdapter({
        cwd: tmpdir,
      }).setup().then(() => {
        assertFileContainsJSON('package.json.ember-try', { originalPackageJSON: true });
        assertFileContainsJSON('.node_modules.ember-try/prove-it.json', { originalNodeModules: true });
      });
    });
  });

  describe('#_install', () => {
    describe('without yarn', () => {
      it('runs npm prune and npm install', () => {
        writeJSONFile('package.json', fixturePackage);
        let runCount = 0;
        let stubbedRun = generateMockRun([{
          command: 'npm install --no-shrinkwrap',
          callback(command, args, opts) {
            runCount++;
            expect(opts).to.have.property('cwd', tmpdir);
            return RSVP.resolve();
          },
        }, {
          command: 'npm prune',
          callback(command, args, opts) {
            runCount++;
            expect(opts).to.have.property('cwd', tmpdir);
            return RSVP.resolve();
          },
        }], { allowPassthrough: false });

        return new NpmAdapter({
          cwd: tmpdir,
          run: stubbedRun,
        })._install().then(() => {
          expect(runCount).to.equal(2, 'Both commands should run');
        });
      });

      it('uses managerOptions for npm commands', () => {
        writeJSONFile('package.json', fixturePackage);
        let runCount = 0;
        let stubbedRun = generateMockRun([{
          command: 'npm install --no-optional --no-shrinkwrap',
          callback() {
            runCount++;
            return RSVP.resolve();
          },
        }, {
          command: 'npm prune',
          callback() {
            runCount++;
            return RSVP.resolve();
          },
        }], { allowPassthrough: false });

        return new NpmAdapter({
          cwd: tmpdir,
          run: stubbedRun,
          managerOptions: ['--no-optional'],
        })._install().then(() => {
          expect(runCount).to.equal(2, 'Both commands should run');
        });
      });
    });

    describe('with yarn', () => {
      it('runs yarn install', () => {
        writeJSONFile('package.json', fixturePackage);
        let runCount = 0;
        let stubbedRun = generateMockRun([{
          command: 'yarn install --no-lockfile --ignore-engines',
          callback(command, args, opts) {
            runCount++;
            expect(opts).to.have.property('cwd', tmpdir);
            return RSVP.resolve();
          },
        }], { allowPassthrough: false });

        return new NpmAdapter({
          cwd: tmpdir,
          run: stubbedRun,
          useYarnCommand: true,
        })._install().then(() => {
          expect(runCount).to.equal(1, 'Only yarn install should run');
        });
      });

      it('uses managerOptions for yarn commands', () => {
        writeJSONFile('package.json', fixturePackage);
        let runCount = 0;
        let stubbedRun = generateMockRun([{
          command: 'yarn install --flat --no-lockfile --ignore-engines',
          callback() {
            runCount++;
            return RSVP.resolve();
          },
        }], { allowPassthrough: false });

        return new NpmAdapter({
          cwd: tmpdir,
          run: stubbedRun,
          useYarnCommand: true,
          managerOptions: ['--flat'],
        })._install().then(() => {
          expect(runCount).to.equal(1, 'Only yarn install should run with manager options');
        });
      });
    });
  });

  describe('#_restoreOriginalDependencies', () => {
    it('replaces the package.json with the backed up version', () => {
      writeJSONFile('package.json.ember-try', { originalPackageJSON: true });
      writeJSONFile('package.json', { originalPackageJSON: false });
      fs.mkdirSync('.node_modules.ember-try');
      writeJSONFile('.node_modules.ember-try/prove-it.json', { originalNodeModules: true });
      return new NpmAdapter({ cwd: tmpdir })._restoreOriginalDependencies().then(() => {
        assertFileContainsJSON('package.json', { originalPackageJSON: true });
        assertFileContainsJSON('node_modules/prove-it.json', { originalNodeModules: true });
      });
    });
  });

  describe('#_packageJSONForDependencySet', () => {
    it('changes specified dependency versions', () => {
      let npmAdapter = new NpmAdapter({ cwd: tmpdir });
      let packageJSON = { devDependencies: { 'ember-feature-flags': '1.0.0' }, dependencies: { 'ember-cli-babel': '5.0.0' } };
      let depSet = { dependencies: { 'ember-cli-babel': '6.0.0' } };

      let resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.dependencies['ember-cli-babel']).to.equal('6.0.0');
    });

    it('changes specified npm dev dependency versions', () => {
      let npmAdapter = new NpmAdapter({ cwd: tmpdir });
      let packageJSON = { devDependencies: { 'ember-feature-flags': '1.0.0' }, dependencies: { 'ember-cli-babel': '5.0.0' } };
      let depSet = { devDependencies: { 'ember-feature-flags': '2.0.1' } };

      let resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.devDependencies['ember-feature-flags']).to.equal('2.0.1');
    });

    it('changes specified npm peer dependency versions', () => {
      let npmAdapter = new NpmAdapter({ cwd: tmpdir });
      let packageJSON = { peerDependencies: { 'ember-cli-babel': '5.0.0' } };
      let depSet = { peerDependencies: { 'ember-cli-babel': '4.0.0' } };

      let resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.peerDependencies['ember-cli-babel']).to.equal('4.0.0');
    });

    it('can remove a package', () => {
      let npmAdapter = new NpmAdapter({ cwd: tmpdir });
      let packageJSON = { devDependencies: { 'ember-feature-flags': '1.0.0' } };
      let depSet = { devDependencies: { 'ember-feature-flags': null } };

      let resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.devDependencies).to.not.have.property('ember-feature-flags');
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
  expect(result).to.equal(true, `File ${filename} is expected to contain ${expectedContents}`);
}

function escapeForRegex(str) {
  return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}
