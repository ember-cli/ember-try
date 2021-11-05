'use strict';

let expect = require('chai').expect;
let RSVP = require('rsvp');
let fs = require('fs-extra');
let path = require('path');
let tmp = require('tmp-sync');
let fixturePackage = require('../fixtures/package.json');
let NpmAdapter = require('../../lib/dependency-manager-adapters/npm');
let writeJSONFile = require('../helpers/write-json-file');
let assertFileContainsJSON = require('../helpers/assert-file-contains-json');
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
      })
        .setup()
        .then(() => {
          assertFileContainsJSON(path.join(tmpdir, 'package.json.ember-try'), {
            originalPackageJSON: true,
          });
          assertFileContainsJSON(path.join(tmpdir, '.node_modules.ember-try/prove-it.json'), {
            originalNodeModules: true,
          });
        });
    });

    it('backs up the yarn.lock file, npm-shrinkwrap.json and package-lock.json if they exist', () => {
      fs.mkdirSync('node_modules');
      writeJSONFile('node_modules/prove-it.json', { originalNodeModules: true });
      writeJSONFile('package.json', { originalPackageJSON: true });
      writeJSONFile('yarn.lock', { originalYarnLock: true });
      writeJSONFile('npm-shrinkwrap.json', { originalNpmShrinkWrap: true });
      writeJSONFile('package-lock.json', { originalPackageLock: true });
      return new NpmAdapter({
        cwd: tmpdir,
      })
        .setup()
        .then(() => {
          assertFileContainsJSON(path.join(tmpdir, 'package.json.ember-try'), {
            originalPackageJSON: true,
          });
          assertFileContainsJSON(path.join(tmpdir, '.node_modules.ember-try/prove-it.json'), {
            originalNodeModules: true,
          });
          assertFileContainsJSON(path.join(tmpdir, 'yarn.lock.ember-try'), {
            originalYarnLock: true,
          });
          assertFileContainsJSON(path.join(tmpdir, 'npm-shrinkwrap.json.ember-try'), {
            originalNpmShrinkWrap: true,
          });
          assertFileContainsJSON(path.join(tmpdir, 'package-lock.json.ember-try'), {
            originalPackageLock: true,
          });
        });
    });
  });

  describe('#_install', () => {
    describe('without yarn', () => {
      it('only runs npm install with npm 5', () => {
        writeJSONFile('package.json', fixturePackage);
        let runCount = 0;
        let stubbedRun = generateMockRun(
          [
            {
              command: 'npm install --no-shrinkwrap',
              callback(command, args, opts) {
                runCount++;
                expect(opts).to.have.property('cwd', tmpdir);
                return RSVP.resolve();
              },
            },
            {
              command: 'npm --version',
              callback() {
                runCount++;
                return RSVP.resolve({ stdout: '5.7.1' });
              },
            },
          ],
          { allowPassthrough: false }
        );

        return new NpmAdapter({
          cwd: tmpdir,
          run: stubbedRun,
        })
          ._install()
          .then(() => {
            expect(runCount).to.equal(2);
          });
      });

      it('runs npm prune and npm install with npm 4', () => {
        writeJSONFile('package.json', fixturePackage);
        let runCount = 0;
        let stubbedRun = generateMockRun(
          [
            {
              command: 'npm install --no-shrinkwrap',
              callback(command, args, opts) {
                runCount++;
                expect(opts).to.have.property('cwd', tmpdir);
                return RSVP.resolve();
              },
            },
            {
              command: 'npm prune',
              callback(command, args, opts) {
                runCount++;
                expect(opts).to.have.property('cwd', tmpdir);
                return RSVP.resolve();
              },
            },
            {
              command: 'npm --version',
              callback() {
                runCount++;
                return RSVP.resolve({ stdout: '4.7.1' });
              },
            },
          ],
          { allowPassthrough: false }
        );

        return new NpmAdapter({
          cwd: tmpdir,
          run: stubbedRun,
        })
          ._install()
          .then(() => {
            expect(runCount).to.equal(3, 'All three commands should run');
          });
      });

      it('uses managerOptions for npm commands', () => {
        writeJSONFile('package.json', fixturePackage);
        let runCount = 0;
        let stubbedRun = generateMockRun(
          [
            {
              command: 'npm install --no-optional --no-shrinkwrap',
              callback() {
                runCount++;
                return RSVP.resolve();
              },
            },
            {
              command: 'npm --version',
              callback() {
                runCount++;
                return RSVP.resolve({ stdout: '5.7.1' });
              },
            },
          ],
          { allowPassthrough: false }
        );

        return new NpmAdapter({
          cwd: tmpdir,
          run: stubbedRun,
          managerOptions: ['--no-optional'],
        })
          ._install()
          .then(() => {
            expect(runCount).to.equal(2);
          });
      });

      it('uses buildManagerOptions for npm commands', () => {
        writeJSONFile('package.json', fixturePackage);
        let runCount = 0;
        let stubbedRun = generateMockRun(
          [
            {
              command: 'npm install --flat',
              callback() {
                runCount++;
                return RSVP.resolve();
              },
            },
            {
              command: 'npm --version',
              callback() {
                runCount++;
                return RSVP.resolve({ stdout: '5.7.1' });
              },
            },
          ],
          { allowPassthrough: false }
        );

        return new NpmAdapter({
          cwd: tmpdir,
          run: stubbedRun,
          buildManagerOptions: function () {
            return ['--flat'];
          },
        })
          ._install()
          .then(() => {
            expect(runCount).to.equal(2, 'npm install should run with buildManagerOptions');
          });
      });

      it('throws an error if buildManagerOptions does not return an array', async () => {
        let error;
        try {
          let adapter = new NpmAdapter({
            cwd: tmpdir,
            run: () => {},
            buildManagerOptions: function () {
              return 'string';
            },
          });

          await adapter._install();
        } catch (e) {
          error = e;
        }

        expect(error.message).to.include('buildManagerOptions must return an array of options');
      });
    });

    describe('with yarn', () => {
      it('runs yarn install', () => {
        writeJSONFile('package.json', fixturePackage);
        let runCount = 0;
        let stubbedRun = generateMockRun(
          [
            {
              command: 'yarn install --no-lockfile --ignore-engines',
              callback(command, args, opts) {
                runCount++;
                expect(opts).to.have.property('cwd', tmpdir);
                return RSVP.resolve();
              },
            },
          ],
          { allowPassthrough: false }
        );

        return new NpmAdapter({
          cwd: tmpdir,
          run: stubbedRun,
          useYarnCommand: true,
        })
          ._install()
          .then(() => {
            expect(runCount).to.equal(1, 'Only yarn install should run');
          });
      });

      it('uses managerOptions for yarn commands', () => {
        writeJSONFile('package.json', fixturePackage);
        let runCount = 0;
        let stubbedRun = generateMockRun(
          [
            {
              command: 'yarn install --flat --no-lockfile --ignore-engines',
              callback() {
                runCount++;
                return RSVP.resolve();
              },
            },
          ],
          { allowPassthrough: false }
        );

        return new NpmAdapter({
          cwd: tmpdir,
          run: stubbedRun,
          useYarnCommand: true,
          managerOptions: ['--flat'],
        })
          ._install()
          .then(() => {
            expect(runCount).to.equal(1, 'Only yarn install should run with manager options');
          });
      });

      it('uses buildManagerOptions for yarn commands', () => {
        writeJSONFile('package.json', fixturePackage);
        let runCount = 0;
        let stubbedRun = generateMockRun(
          [
            {
              command: 'yarn install --flat',
              callback() {
                runCount++;
                return RSVP.resolve();
              },
            },
          ],
          { allowPassthrough: false }
        );

        return new NpmAdapter({
          cwd: tmpdir,
          run: stubbedRun,
          useYarnCommand: true,
          buildManagerOptions: function () {
            return ['--flat'];
          },
        })
          ._install()
          .then(() => {
            expect(runCount).to.equal(1, 'Only yarn install should run with buildManagerOptions');
          });
      });

      it('throws an error if buildManagerOptions does not return an array', async () => {
        let error;
        try {
          let adapter = new NpmAdapter({
            cwd: tmpdir,
            run: () => {},
            useYarnCommand: true,
            buildManagerOptions: function () {
              return 'string';
            },
          });

          await adapter._install();
        } catch (e) {
          error = e;
        }

        expect(error.message).to.include('buildManagerOptions must return an array of options');
      });
    });
  });

  describe('#restoreOriginalDependencies', () => {
    it('replaces the package.json with the backed up version', () => {
      writeJSONFile('package.json.ember-try', { originalPackageJSON: true });
      writeJSONFile('package.json', { originalPackageJSON: false });
      fs.mkdirSync('.node_modules.ember-try');
      writeJSONFile('.node_modules.ember-try/prove-it.json', { originalNodeModules: true });
      return new NpmAdapter({ cwd: tmpdir }).restoreOriginalDependencies().then(() => {
        assertFileContainsJSON(path.join(tmpdir, 'package.json'), { originalPackageJSON: true });
        assertFileContainsJSON(path.join(tmpdir, 'node_modules/prove-it.json'), {
          originalNodeModules: true,
        });
      });
    });

    it('replaces the yarn.lock, npm-shrinkwrap.json and package-lock.json with the backed up version if they exist', () => {
      writeJSONFile('package.json.ember-try', { originalPackageJSON: true });
      writeJSONFile('package.json', { originalPackageJSON: false });
      fs.mkdirSync('.node_modules.ember-try');
      writeJSONFile('.node_modules.ember-try/prove-it.json', { originalNodeModules: true });
      writeJSONFile('yarn.lock.ember-try', { originalYarnLock: true });
      writeJSONFile('yarn.lock', { originalYarnLock: false });
      writeJSONFile('npm-shrinkwrap.json.ember-try', { originalNpmShrinkWrap: true });
      writeJSONFile('npm-shrinkwrap.json', { originalNpmShrinkWrap: false });
      writeJSONFile('package-lock.json.ember-try', { originalPackageLock: true });
      writeJSONFile('package-lock.json', { originalPackageLock: false });
      return new NpmAdapter({ cwd: tmpdir }).restoreOriginalDependencies().then(() => {
        assertFileContainsJSON(path.join(tmpdir, 'package.json'), { originalPackageJSON: true });
        assertFileContainsJSON(path.join(tmpdir, 'node_modules/prove-it.json'), {
          originalNodeModules: true,
        });
        assertFileContainsJSON(path.join(tmpdir, 'yarn.lock'), { originalYarnLock: true });
        assertFileContainsJSON(path.join(tmpdir, 'npm-shrinkwrap.json'), {
          originalNpmShrinkWrap: true,
        });
        assertFileContainsJSON(path.join(tmpdir, 'package-lock.json'), {
          originalPackageLock: true,
        });
      });
    });
  });

  describe('#_packageJSONForDependencySet', () => {
    it('changes specified dependency versions', () => {
      let npmAdapter = new NpmAdapter({ cwd: tmpdir });
      let packageJSON = {
        devDependencies: { 'ember-feature-flags': '1.0.0' },
        dependencies: { 'ember-cli-babel': '5.0.0' },
      };
      let depSet = { dependencies: { 'ember-cli-babel': '6.0.0' } };

      let resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.dependencies['ember-cli-babel']).to.equal('6.0.0');
    });

    describe('ember property', () => {
      it('adds the ember property to project package.json', () => {
        let npmAdapter = new NpmAdapter({
          cwd: tmpdir,
          useYarnCommand: true,
        });
        let packageJSON = {};
        let depSet = {
          ember: { edition: 'octane' },
        };

        let resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

        expect(resultJSON).to.deep.equal({ ember: { edition: 'octane' } });
      });

      it('merges the ember property to project package.json', () => {
        let npmAdapter = new NpmAdapter({
          cwd: tmpdir,
          useYarnCommand: true,
        });
        let packageJSON = { ember: { foo: 'bar' } };
        let depSet = {
          ember: { edition: 'octane' },
        };

        let resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

        expect(resultJSON).to.deep.equal({ ember: { foo: 'bar', edition: 'octane' } });
      });

      it('overrides existing fields inside the ember property to project package.json', () => {
        let npmAdapter = new NpmAdapter({
          cwd: tmpdir,
          useYarnCommand: true,
        });
        let packageJSON = { ember: { edition: 'classic' } };
        let depSet = {
          ember: { edition: 'octane' },
        };

        let resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

        expect(resultJSON).to.deep.equal({ ember: { edition: 'octane' } });
      });

      it('removes any items with a null value', () => {
        let npmAdapter = new NpmAdapter({
          cwd: tmpdir,
          useYarnCommand: true,
        });
        let packageJSON = { ember: { edition: 'octane' } };
        let depSet = {
          ember: { edition: null },
        };

        let resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

        expect(resultJSON).to.deep.equal({ ember: {} });
      });
    });

    it('adds a resolution for the specified dependency version', () => {
      let npmAdapter = new NpmAdapter({
        cwd: tmpdir,
        useYarnCommand: true,
      });
      let packageJSON = {
        dependencies: { 'ember-cli-babel': '5.0.0' },
      };
      let depSet = {
        dependencies: { 'ember-cli-babel': '6.0.0' },
        resolutions: { 'ember-cli-babel': '6.0.0' },
      };

      let resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.resolutions['ember-cli-babel']).to.equal('6.0.0');
    });

    it('removes a dependency from resolutions if its version is null', () => {
      let npmAdapter = new NpmAdapter({
        cwd: tmpdir,
        useYarnCommand: true,
      });
      let packageJSON = {
        dependencies: { 'ember-cli-babel': '5.0.0' },
        resolutions: { 'ember-cli-babel': '5.0.0' },
      };
      let depSet = {
        dependencies: { 'ember-cli-babel': '6.0.0' },
        resolutions: { 'ember-cli-babel': null },
      };

      let resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.resolutions['ember-cli-babel']).to.be.undefined;
    });

    it('doesnt add resolutions if there are none specified', () => {
      let npmAdapter = new NpmAdapter({
        cwd: tmpdir,
        useYarnCommand: true,
      });
      let packageJSON = {
        dependencies: { 'ember-cli-babel': '5.0.0' },
      };
      let depSet = {
        dependencies: { 'ember-cli-babel': '6.0.0' },
      };

      let resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.resolutions).to.be.undefined;
    });

    it('doesnt add resolutions when not using yarn', () => {
      let npmAdapter = new NpmAdapter({
        cwd: tmpdir,
        useYarnCommand: false,
      });
      let packageJSON = {
        dependencies: { 'ember-cli-babel': '5.0.0' },
      };
      let depSet = {
        dependencies: { 'ember-cli-babel': '6.0.0' },
        resolutions: { 'ember-cli-babel': '6.0.0' },
      };

      let resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.resolutions).to.be.undefined;
    });

    it('changes specified npm dev dependency versions', () => {
      let npmAdapter = new NpmAdapter({ cwd: tmpdir });
      let packageJSON = {
        devDependencies: { 'ember-feature-flags': '1.0.0' },
        dependencies: { 'ember-cli-babel': '5.0.0' },
      };
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
