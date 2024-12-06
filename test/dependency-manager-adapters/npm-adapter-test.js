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
    it('backs up the `package.json`, `package-lock.json` and `yarn.lock` files if they exist', async () => {
      writeJSONFile('package.json', { originalPackageJSON: true });
      writeJSONFile('package-lock.json', { originalPackageLock: true });
      writeJSONFile('yarn.lock', { originalYarnLock: true });

      let adapter = new NpmAdapter({ cwd: tmpdir });

      await adapter.setup();

      assertFileContainsJSON(adapter.backup.pathForFile('package.json'), {
        originalPackageJSON: true,
      });
      assertFileContainsJSON(adapter.backup.pathForFile('package-lock.json'), {
        originalPackageLock: true,
      });
      assertFileContainsJSON(adapter.backup.pathForFile('yarn.lock'), {
        originalYarnLock: true,
      });
    });
  });

  describe('#_install', () => {
    describe('without yarn', () => {
      it('runs npm install', async () => {
        writeJSONFile('package.json', fixturePackage);
        let runCount = 0;
        let stubbedRun = generateMockRun(
          [
            {
              command: 'npm install --no-package-lock',
              callback(command, args, opts) {
                runCount++;
                expect(opts).to.have.property('cwd', tmpdir);
                return RSVP.resolve();
              },
            },
          ],
          { allowPassthrough: false },
        );

        let adapter = new NpmAdapter({
          cwd: tmpdir,
          run: stubbedRun,
        });

        await adapter._install();
        expect(runCount).to.equal(1);
      });

      it('uses managerOptions for npm commands', async () => {
        writeJSONFile('package.json', fixturePackage);
        let runCount = 0;
        let stubbedRun = generateMockRun(
          [
            {
              command: 'npm install --no-optional --no-package-lock',
              callback() {
                runCount++;
                return RSVP.resolve();
              },
            },
          ],
          { allowPassthrough: false },
        );

        let adapter = new NpmAdapter({
          cwd: tmpdir,
          run: stubbedRun,
          managerOptions: ['--no-optional'],
        });

        await adapter._install();
        expect(runCount).to.equal(1);
      });

      it('uses buildManagerOptions for npm commands', async () => {
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
          ],
          { allowPassthrough: false },
        );

        let adapter = new NpmAdapter({
          cwd: tmpdir,
          run: stubbedRun,
          buildManagerOptions: function () {
            return ['--flat'];
          },
        });

        await adapter._install();
        expect(runCount).to.equal(1, 'npm install should run with buildManagerOptions');
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
      it('runs yarn install', async () => {
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
          { allowPassthrough: false },
        );

        let adapter = new NpmAdapter({
          cwd: tmpdir,
          run: stubbedRun,
          useYarnCommand: true,
        });

        await adapter._install();
        expect(runCount).to.equal(1, 'Only yarn install should run');
      });

      it('uses managerOptions for yarn commands', async () => {
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
          { allowPassthrough: false },
        );

        let adapter = new NpmAdapter({
          cwd: tmpdir,
          run: stubbedRun,
          useYarnCommand: true,
          managerOptions: ['--flat'],
        });

        await adapter._install();
        expect(runCount).to.equal(1, 'Only yarn install should run with manager options');
      });

      it('uses buildManagerOptions for yarn commands', async () => {
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
          { allowPassthrough: false },
        );

        let adapter = new NpmAdapter({
          cwd: tmpdir,
          run: stubbedRun,
          useYarnCommand: true,
          buildManagerOptions: function () {
            return ['--flat'];
          },
        });

        await adapter._install();
        expect(runCount).to.equal(1, 'Only yarn install should run with buildManagerOptions');
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

  describe('#_restoreOriginalDependencies', () => {
    it('restores the `package.json`, `package-lock.json` and `yarn.lock` files if they exist', async () => {
      writeJSONFile('package.json', { originalPackageJSON: true });
      writeJSONFile('package-lock.json', { originalPackageLock: true });
      writeJSONFile('yarn.lock', { originalYarnLock: true });

      let adapter = new NpmAdapter({ cwd: tmpdir });

      await adapter.setup();

      // Simulate modifying the files:
      writeJSONFile('package.json', { originalPackageJSON: false });
      writeJSONFile('package-lock.json', { originalPackageLock: false });
      writeJSONFile('yarn.lock', { originalYarnLock: false });

      await adapter._restoreOriginalDependencies();

      assertFileContainsJSON(path.join(tmpdir, 'package.json'), {
        originalPackageJSON: true,
      });
      assertFileContainsJSON(path.join(tmpdir, 'package-lock.json'), {
        originalPackageLock: true,
      });
      assertFileContainsJSON(path.join(tmpdir, 'yarn.lock'), {
        originalYarnLock: true,
      });
    });

    it('installs the original node modules again', async () => {
      let runCount = 0;
      let stubbedRun = generateMockRun(
        [
          {
            command: 'npm install --no-package-lock',
            callback() {
              runCount++;
              return Promise.resolve();
            },
          },
        ],
        { allowPassthrough: false },
      );

      let adapter = new NpmAdapter({
        cwd: tmpdir,
        run: stubbedRun,
      });

      await adapter._restoreOriginalDependencies();

      expect(runCount).to.equal(1);
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

    describe('overrides', () => {
      it('adds an override if you use a pre-release version for something', () => {
        let npmAdapter = new NpmAdapter({
          cwd: tmpdir,
        });
        let packageJSON = { dependencies: { ember: '4.1.4' } };
        let depSet = {
          dependencies: { ember: '4.8.0-beta.1' },
        };

        let resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

        expect(resultJSON).to.deep.equal({
          dependencies: { ember: '4.8.0-beta.1' },
          overrides: { ember: '$ember' },
        });
      });

      it('does not add an override if you use a pre-release version with yarn', () => {
        let npmAdapter = new NpmAdapter({
          cwd: tmpdir,
          useYarnCommand: true,
        });
        let packageJSON = { dependencies: { ember: '4.1.4' } };
        let depSet = {
          dependencies: { ember: '4.8.0-beta.1' },
        };

        let resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

        expect(resultJSON).to.deep.equal({
          dependencies: { ember: '4.8.0-beta.1' },
        });
      });

      it('adds an override if you specify a version with a link to a .tgz file', () => {
        let npmAdapter = new NpmAdapter({
          cwd: tmpdir,
        });
        let packageJSON = { dependencies: { ember: '4.1.4' } };
        let depSet = {
          dependencies: { ember: 'https://somesite.com/dependencies/funtime.tgz' },
        };

        let resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

        expect(resultJSON).to.deep.equal({
          dependencies: { ember: 'https://somesite.com/dependencies/funtime.tgz' },
          overrides: { ember: '$ember' },
        });
      });

      it('does not add an override if you specify any other kind of link', () => {
        let npmAdapter = new NpmAdapter({
          cwd: tmpdir,
        });
        let packageJSON = { dependencies: { ember: '4.1.4' } };
        let depSet = {
          dependencies: { ember: 'https://github.com/github/super-secret' },
        };

        let resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

        expect(resultJSON).to.deep.equal({
          dependencies: { ember: 'https://github.com/github/super-secret' },
        });
      });
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

    it('adds a override for the specified dependency version', () => {
      let npmAdapter = new NpmAdapter({
        cwd: tmpdir,
      });
      let packageJSON = {
        dependencies: { 'ember-cli-babel': '5.0.0' },
      };
      let depSet = {
        dependencies: { 'ember-cli-babel': '6.0.0' },
        overrides: { 'ember-cli-babel': '6.0.0' },
      };

      let resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.overrides['ember-cli-babel']).to.equal('6.0.0');
    });

    it('removes a dependency from overrides if its version is null', () => {
      let npmAdapter = new NpmAdapter({
        cwd: tmpdir,
      });
      let packageJSON = {
        dependencies: { 'ember-cli-babel': '5.0.0' },
        overrides: { 'ember-cli-babel': '5.0.0' },
      };
      let depSet = {
        dependencies: { 'ember-cli-babel': '6.0.0' },
        overrides: { 'ember-cli-babel': null },
      };

      let resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.overrides['ember-cli-babel']).to.be.undefined;
    });

    it('doesnt add overrides if there are none specified', () => {
      let npmAdapter = new NpmAdapter({
        cwd: tmpdir,
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

    it('doesnt add overrides when using yarn', () => {
      let npmAdapter = new NpmAdapter({
        cwd: tmpdir,
        useYarnCommand: true,
      });
      let packageJSON = {
        dependencies: { 'ember-cli-babel': '5.0.0' },
      };
      let depSet = {
        dependencies: { 'ember-cli-babel': '6.0.0' },
        overrides: { 'ember-cli-babel': '6.0.0' },
      };

      let resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.overrides).to.be.undefined;
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
