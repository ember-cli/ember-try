'use strict';

let expect = require('chai').expect;
let fs = require('fs-extra');
let path = require('path');
let tmp = require('tmp-sync');
let fixturePackage = require('../fixtures/package.json');
let NpmAdapter = require('../../lib/dependency-manager-adapters/npm');
let writeJSONFile = require('../helpers/write-json-file');
let assertFileContainsJSON = require('../helpers/assert-file-contains-json');
let generateMockRun = require('../helpers/generate-mock-run');

let root = process.cwd();
let tmproot = path.join(root, 'tmp');
let tmpdir;

describe('npm Adapter', () => {
  beforeEach(() => {
    tmpdir = tmp.in(tmproot);
    process.chdir(tmpdir);
  });

  afterEach(() => {
    process.chdir(root);
    return fs.remove(tmproot);
  });

  describe('#setup', () => {
    it('backs up the `package.json` and `package-lock.json` files if they exist', async () => {
      writeJSONFile('package.json', { originalPackageJSON: true });
      writeJSONFile('package-lock.json', { originalPackageLock: true });

      let adapter = new NpmAdapter({ cwd: tmpdir });

      await adapter.setup();

      assertFileContainsJSON(adapter.backup.pathForFile('package.json'), {
        originalPackageJSON: true,
      });
      assertFileContainsJSON(adapter.backup.pathForFile('package-lock.json'), {
        originalPackageLock: true,
      });
    });
  });

  describe('#_install', () => {
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
              return Promise.resolve();
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
              return Promise.resolve();
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

  describe('#cleanup', () => {
    it('restores the `package.json` and `package-lock.json` files if they exist', async () => {
      writeJSONFile('package.json', { originalPackageJSON: true });
      writeJSONFile('package-lock.json', { originalPackageLock: true });

      let adapter = new NpmAdapter({ cwd: tmpdir });

      await adapter.setup();

      // Simulate modifying the files:
      writeJSONFile('package.json', { originalPackageJSON: false });
      writeJSONFile('package-lock.json', { originalPackageLock: false });

      await adapter.cleanup();

      assertFileContainsJSON(path.join(tmpdir, 'package.json'), {
        originalPackageJSON: true,
      });
      assertFileContainsJSON(path.join(tmpdir, 'package-lock.json'), {
        originalPackageLock: true,
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

      await adapter.cleanup();

      expect(runCount).to.equal(1);
    });
  });

  describe('#_packageJSONForDependencySet', () => {
    it('changes specified dependency versions', () => {
      let adapter = new NpmAdapter({ cwd: tmpdir });
      let packageJSON = {
        devDependencies: { 'ember-feature-flags': '1.0.0' },
        dependencies: { 'ember-cli-babel': '5.0.0' },
      };
      let depSet = { dependencies: { 'ember-cli-babel': '6.0.0' } };

      let resultJSON = adapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.dependencies['ember-cli-babel']).to.equal('6.0.0');
    });

    describe('overrides', () => {
      it('adds an override if you use a pre-release version for something', () => {
        let adapter = new NpmAdapter({
          cwd: tmpdir,
        });
        let packageJSON = { dependencies: { ember: '4.1.4' } };
        let depSet = {
          dependencies: { ember: '4.8.0-beta.1' },
        };

        let resultJSON = adapter._packageJSONForDependencySet(packageJSON, depSet);

        expect(resultJSON).to.deep.equal({
          dependencies: { ember: '4.8.0-beta.1' },
          overrides: { ember: '$ember' },
        });
      });

      it('adds an override if you specify a version with a link to a .tgz file', () => {
        let adapter = new NpmAdapter({
          cwd: tmpdir,
        });
        let packageJSON = { dependencies: { ember: '4.1.4' } };
        let depSet = {
          dependencies: { ember: 'https://somesite.com/dependencies/funtime.tgz' },
        };

        let resultJSON = adapter._packageJSONForDependencySet(packageJSON, depSet);

        expect(resultJSON).to.deep.equal({
          dependencies: { ember: 'https://somesite.com/dependencies/funtime.tgz' },
          overrides: { ember: '$ember' },
        });
      });

      it('does not add an override if you specify any other kind of link', () => {
        let adapter = new NpmAdapter({
          cwd: tmpdir,
        });
        let packageJSON = { dependencies: { ember: '4.1.4' } };
        let depSet = {
          dependencies: { ember: 'https://github.com/github/super-secret' },
        };

        let resultJSON = adapter._packageJSONForDependencySet(packageJSON, depSet);

        expect(resultJSON).to.deep.equal({
          dependencies: { ember: 'https://github.com/github/super-secret' },
        });
      });
    });

    describe('ember property', () => {
      it('adds the ember property to project package.json', () => {
        let adapter = new NpmAdapter({
          cwd: tmpdir,
        });
        let packageJSON = {};
        let depSet = {
          ember: { edition: 'octane' },
        };

        let resultJSON = adapter._packageJSONForDependencySet(packageJSON, depSet);

        expect(resultJSON).to.deep.equal({ ember: { edition: 'octane' } });
      });

      it('merges the ember property to project package.json', () => {
        let adapter = new NpmAdapter({
          cwd: tmpdir,
        });
        let packageJSON = { ember: { foo: 'bar' } };
        let depSet = {
          ember: { edition: 'octane' },
        };

        let resultJSON = adapter._packageJSONForDependencySet(packageJSON, depSet);

        expect(resultJSON).to.deep.equal({ ember: { foo: 'bar', edition: 'octane' } });
      });

      it('overrides existing fields inside the ember property to project package.json', () => {
        let adapter = new NpmAdapter({
          cwd: tmpdir,
        });
        let packageJSON = { ember: { edition: 'classic' } };
        let depSet = {
          ember: { edition: 'octane' },
        };

        let resultJSON = adapter._packageJSONForDependencySet(packageJSON, depSet);

        expect(resultJSON).to.deep.equal({ ember: { edition: 'octane' } });
      });

      it('removes any items with a null value', () => {
        let adapter = new NpmAdapter({
          cwd: tmpdir,
        });
        let packageJSON = { ember: { edition: 'octane' } };
        let depSet = {
          ember: { edition: null },
        };

        let resultJSON = adapter._packageJSONForDependencySet(packageJSON, depSet);

        expect(resultJSON).to.deep.equal({ ember: {} });
      });
    });

    it('adds a override for the specified dependency version', () => {
      let adapter = new NpmAdapter({
        cwd: tmpdir,
      });
      let packageJSON = {
        dependencies: { 'ember-cli-babel': '5.0.0' },
      };
      let depSet = {
        dependencies: { 'ember-cli-babel': '6.0.0' },
        overrides: { 'ember-cli-babel': '6.0.0' },
      };

      let resultJSON = adapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.overrides['ember-cli-babel']).to.equal('6.0.0');
    });

    it('removes a dependency from overrides if its version is null', () => {
      let adapter = new NpmAdapter({
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

      let resultJSON = adapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.overrides['ember-cli-babel']).to.be.undefined;
    });

    it('doesnt add overrides if there are none specified', () => {
      let adapter = new NpmAdapter({
        cwd: tmpdir,
      });
      let packageJSON = {
        dependencies: { 'ember-cli-babel': '5.0.0' },
      };
      let depSet = {
        dependencies: { 'ember-cli-babel': '6.0.0' },
      };

      let resultJSON = adapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.resolutions).to.be.undefined;
    });

    it('changes specified npm dev dependency versions', () => {
      let adapter = new NpmAdapter({ cwd: tmpdir });
      let packageJSON = {
        devDependencies: { 'ember-feature-flags': '1.0.0' },
        dependencies: { 'ember-cli-babel': '5.0.0' },
      };
      let depSet = { devDependencies: { 'ember-feature-flags': '2.0.1' } };

      let resultJSON = adapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.devDependencies['ember-feature-flags']).to.equal('2.0.1');
    });

    it('changes specified npm peer dependency versions', () => {
      let adapter = new NpmAdapter({ cwd: tmpdir });
      let packageJSON = { peerDependencies: { 'ember-cli-babel': '5.0.0' } };
      let depSet = { peerDependencies: { 'ember-cli-babel': '4.0.0' } };

      let resultJSON = adapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.peerDependencies['ember-cli-babel']).to.equal('4.0.0');
    });

    it('can remove a package', () => {
      let adapter = new NpmAdapter({ cwd: tmpdir });
      let packageJSON = { devDependencies: { 'ember-feature-flags': '1.0.0' } };
      let depSet = { devDependencies: { 'ember-feature-flags': null } };

      let resultJSON = adapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.devDependencies).to.not.have.property('ember-feature-flags');
    });
  });
});
