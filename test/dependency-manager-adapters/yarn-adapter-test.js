import { expect } from 'chai';
import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp-sync';
import YarnAdapter from '../../lib/dependency-manager-adapters/yarn.js';
import writeJSONFile from '../helpers/write-json-file.js';
import assertFileContainsJSON from '../helpers/assert-file-contains-json.js';
import generateMockRun from '../helpers/generate-mock-run.js';

const fixturePackage = fs.readJsonSync('./test/fixtures/package.json');

let root = process.cwd();
let tmproot = path.join(root, 'tmp');
let tmpdir;

describe('yarn Adapter', () => {
  beforeEach(() => {
    tmpdir = tmp.in(tmproot);
    process.chdir(tmpdir);
  });

  afterEach(() => {
    process.chdir(root);
    return fs.remove(tmproot);
  });

  describe('#setup', () => {
    it('backs up the `package.json` and `yarn.lock` files if they exist', async () => {
      writeJSONFile('package.json', { originalPackageJSON: true });
      writeJSONFile('yarn.lock', { originalYarnLock: true });

      let adapter = new YarnAdapter({ cwd: tmpdir });

      await adapter.setup();

      assertFileContainsJSON(adapter.backup.pathForFile('package.json'), {
        originalPackageJSON: true,
      });
      assertFileContainsJSON(adapter.backup.pathForFile('yarn.lock'), {
        originalYarnLock: true,
      });
    });
  });

  describe('#_install', () => {
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
              return Promise.resolve();
            },
          },
        ],
        { allowPassthrough: false },
      );

      let adapter = new YarnAdapter({
        cwd: tmpdir,
        run: stubbedRun,
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
              return Promise.resolve();
            },
          },
        ],
        { allowPassthrough: false },
      );

      let adapter = new YarnAdapter({
        cwd: tmpdir,
        run: stubbedRun,
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
              return Promise.resolve();
            },
          },
        ],
        { allowPassthrough: false },
      );

      let adapter = new YarnAdapter({
        cwd: tmpdir,
        run: stubbedRun,
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
        let adapter = new YarnAdapter({
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
    it('restores the `package.json` and `yarn.lock` files if they exist', async () => {
      writeJSONFile('package.json', { originalPackageJSON: true });
      writeJSONFile('yarn.lock', { originalYarnLock: true });

      let adapter = new YarnAdapter({ cwd: tmpdir });

      await adapter.setup();

      // Simulate modifying the files:
      writeJSONFile('package.json', { originalPackageJSON: false });
      writeJSONFile('yarn.lock', { originalYarnLock: false });

      await adapter.cleanup();

      assertFileContainsJSON(path.join(tmpdir, 'package.json'), {
        originalPackageJSON: true,
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
            command: 'yarn install --no-lockfile --ignore-engines',
            callback() {
              runCount++;
              return Promise.resolve();
            },
          },
        ],
        { allowPassthrough: false },
      );

      let adapter = new YarnAdapter({
        cwd: tmpdir,
        run: stubbedRun,
      });

      await adapter.cleanup();

      expect(runCount).to.equal(1);
    });
  });

  describe('#_packageJSONForDependencySet', () => {
    it('changes specified dependency versions', () => {
      let adapter = new YarnAdapter({ cwd: tmpdir });
      let packageJSON = {
        devDependencies: { 'ember-feature-flags': '1.0.0' },
        dependencies: { 'ember-cli-babel': '5.0.0' },
      };
      let depSet = { dependencies: { 'ember-cli-babel': '6.0.0' } };

      let resultJSON = adapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.dependencies['ember-cli-babel']).to.equal('6.0.0');
    });

    describe('ember property', () => {
      it('adds the ember property to project package.json', () => {
        let adapter = new YarnAdapter({
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
        let adapter = new YarnAdapter({
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
        let adapter = new YarnAdapter({
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
        let adapter = new YarnAdapter({
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

    it('adds a resolution for the specified dependency version', () => {
      let adapter = new YarnAdapter({
        cwd: tmpdir,
      });
      let packageJSON = {
        dependencies: { 'ember-cli-babel': '5.0.0' },
      };
      let depSet = {
        dependencies: { 'ember-cli-babel': '6.0.0' },
        resolutions: { 'ember-cli-babel': '6.0.0' },
      };

      let resultJSON = adapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.resolutions['ember-cli-babel']).to.equal('6.0.0');
    });

    it('removes a dependency from resolutions if its version is null', () => {
      let adapter = new YarnAdapter({
        cwd: tmpdir,
      });
      let packageJSON = {
        dependencies: { 'ember-cli-babel': '5.0.0' },
        resolutions: { 'ember-cli-babel': '5.0.0' },
      };
      let depSet = {
        dependencies: { 'ember-cli-babel': '6.0.0' },
        resolutions: { 'ember-cli-babel': null },
      };

      let resultJSON = adapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.resolutions['ember-cli-babel']).to.be.undefined;
    });

    it('doesnt add resolutions if there are none specified', () => {
      let adapter = new YarnAdapter({
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
      let adapter = new YarnAdapter({ cwd: tmpdir });
      let packageJSON = {
        devDependencies: { 'ember-feature-flags': '1.0.0' },
        dependencies: { 'ember-cli-babel': '5.0.0' },
      };
      let depSet = { devDependencies: { 'ember-feature-flags': '2.0.1' } };

      let resultJSON = adapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.devDependencies['ember-feature-flags']).to.equal('2.0.1');
    });

    it('changes specified npm peer dependency versions', () => {
      let adapter = new YarnAdapter({ cwd: tmpdir });
      let packageJSON = { peerDependencies: { 'ember-cli-babel': '5.0.0' } };
      let depSet = { peerDependencies: { 'ember-cli-babel': '4.0.0' } };

      let resultJSON = adapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.peerDependencies['ember-cli-babel']).to.equal('4.0.0');
    });

    it('can remove a package', () => {
      let adapter = new YarnAdapter({ cwd: tmpdir });
      let packageJSON = { devDependencies: { 'ember-feature-flags': '1.0.0' } };
      let depSet = { devDependencies: { 'ember-feature-flags': null } };

      let resultJSON = adapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.devDependencies).to.not.have.property('ember-feature-flags');
    });
  });
});
