'use strict';

let expect = require('chai').expect;
let fs = require('fs-extra');
let path = require('path');
let tmp = require('tmp-sync');
let fixtureWorkspaces = require('../fixtures/package-with-workspaces.json');
let WorkspaceAdapter = require('../../lib/dependency-manager-adapters/workspace');
let writeJSONFile = require('../helpers/write-json-file');
let assertFileContainsJSON = require('../helpers/assert-file-contains-json');
let generateMockRun = require('../helpers/generate-mock-run');

let root = process.cwd();
let tmproot = path.join(root, 'tmp');
let tmpdir;

describe('workspace Adapter', () => {
  beforeEach(() => {
    tmpdir = tmp.in(tmproot);
    process.chdir(tmpdir);
    writeJSONFile('package.json', fixtureWorkspaces);
  });

  afterEach(() => {
    process.chdir(root);
    return fs.remove(tmproot);
  });

  describe('#setup', () => {
    it('backs up the `package.json` file of subpackages', () => {
      fs.ensureDirSync('packages/test/node_modules');

      writeJSONFile('packages/test/package.json', { originalPackageJSON: true });

      let workspaceAdapter = new WorkspaceAdapter({
        cwd: tmpdir,
        packageManager: 'yarn',
      });

      return workspaceAdapter.setup().then(() => {
        let adapter = workspaceAdapter._packageAdapters[0];

        assertFileContainsJSON(adapter.backup.pathForFile('package.json'), {
          originalPackageJSON: true,
        });
      });
    });

    it('with workspace packages', () => {
      writeJSONFile('package.json', {
        name: 'a-test-project-with-workspaces',
        workspaces: {
          packages: ['packages/*'],
          nohoist: ['@foo/example'],
        },
      });

      fs.ensureDirSync('packages/test/node_modules');

      writeJSONFile('packages/test/package.json', { originalPackageJSON: true });

      let workspaceAdapter = new WorkspaceAdapter({
        cwd: tmpdir,
        packageManager: 'yarn',
      });

      return workspaceAdapter.setup().then(() => {
        let adapter = workspaceAdapter._packageAdapters[0];

        assertFileContainsJSON(adapter.backup.pathForFile('package.json'), {
          originalPackageJSON: true,
        });
      });
    });

    it('backs up the `package.json` and `yarn.lock` files if they exist', () => {
      fs.ensureDirSync('packages/test/node_modules');

      writeJSONFile('packages/test/package.json', { originalPackageJSON: true });
      writeJSONFile('packages/test/yarn.lock', { originalYarnLock: true });

      let workspaceAdapter = new WorkspaceAdapter({
        cwd: tmpdir,
        packageManager: 'yarn',
      });

      return workspaceAdapter.setup().then(() => {
        let adapter = workspaceAdapter._packageAdapters[0];

        assertFileContainsJSON(adapter.backup.pathForFile('package.json'), {
          originalPackageJSON: true,
        });
        assertFileContainsJSON(adapter.backup.pathForFile('yarn.lock'), {
          originalYarnLock: true,
        });
      });
    });

    it('throws an error if workspaces are not present', () => {
      writeJSONFile('package.json', {
        name: 'a-test-project-with-workspaces',
      });

      expect(() => {
        return new WorkspaceAdapter({
          cwd: tmpdir,
          packageManager: 'yarn',
        }).setup();
      }).to.throw(
        /you must define the `workspaces` property in package.json with at least one workspace to use workspaces with ember-try/,
      );
    });
  });

  describe('#_install', () => {
    describe('without yarn', () => {
      it('throws an error', () => {
        expect(() => {
          return new WorkspaceAdapter({
            cwd: tmpdir,
          });
        }).to.throw(
          /workspaces are currently only supported by Yarn, you must set `packageManager` to `yarn`/,
        );
      });
    });

    describe('with yarn', () => {
      it('runs yarn install', () => {
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

        return new WorkspaceAdapter({
          cwd: tmpdir,
          run: stubbedRun,
          packageManager: 'yarn',
        })
          ._install()
          .then(() => {
            expect(runCount).to.equal(1, 'Only yarn install should run');
          });
      });

      it('uses managerOptions for yarn commands', () => {
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

        return new WorkspaceAdapter({
          cwd: tmpdir,
          run: stubbedRun,
          packageManager: 'yarn',
          managerOptions: ['--flat'],
        })
          ._install()
          .then(() => {
            expect(runCount).to.equal(1, 'Only yarn install should run with manager options');
          });
      });

      it('uses buildManagerOptions to override defaults for yarn commands', () => {
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

        return new WorkspaceAdapter({
          cwd: tmpdir,
          run: stubbedRun,
          packageManager: 'yarn',
          buildManagerOptions: function () {
            return ['--flat'];
          },
        })
          ._install()
          .then(() => {
            expect(runCount).to.equal(1, 'Only yarn install should run with buildManagerOptions');
          });
      });

      it('throws an error if buildManagerOptions does not return an array', () => {
        expect(() => {
          new WorkspaceAdapter({
            cwd: tmpdir,
            run: () => {},
            packageManager: 'yarn',
            buildManagerOptions: function () {
              return 'string';
            },
          })._install();
        }).to.throw(/buildManagerOptions must return an array of options/);
      });
    });
  });

  describe('#cleanup', () => {
    it('works without having called #setup first', async () => {
      fs.ensureDirSync('packages/test/node_modules');

      writeJSONFile('packages/test/package.json', { originalPackageJSON: true });

      let workspaceAdapter = new WorkspaceAdapter({
        cwd: tmpdir,
        packageManager: 'yarn',
        run: () => Promise.resolve(),
      });

      let adapter = workspaceAdapter._packageAdapters[0];

      await adapter.setup();

      // Simulate modifying the file:
      writeJSONFile('packages/test/package.json', { originalPackageJSON: false });

      return workspaceAdapter.cleanup().then(() => {
        assertFileContainsJSON(path.join(tmpdir, 'packages/test/package.json'), {
          originalPackageJSON: true,
        });
      });
    });

    it('replaces the package.json with the backed up version', () => {
      fs.ensureDirSync('packages/test/node_modules');

      writeJSONFile('packages/test/package.json', { originalPackageJSON: true });

      let workspaceAdapter = new WorkspaceAdapter({
        cwd: tmpdir,
        packageManager: 'yarn',
        run: () => Promise.resolve(),
      });

      return workspaceAdapter
        .setup()
        .then(() => {
          writeJSONFile('packages/test/package.json', { originalPackageJSON: false });

          return workspaceAdapter.cleanup();
        })
        .then(() => {
          assertFileContainsJSON(path.join(tmpdir, 'packages/test/package.json'), {
            originalPackageJSON: true,
          });
        });
    });

    it('replaces the yarn.lock with the backed up version if they exist', () => {
      fs.ensureDirSync('packages/test/node_modules');

      writeJSONFile('packages/test/package.json', { originalPackageJSON: true });
      writeJSONFile('packages/test/yarn.lock', { originalYarnLock: true });

      let workspaceAdapter = new WorkspaceAdapter({
        cwd: tmpdir,
        packageManager: 'yarn',
        run: () => Promise.resolve(),
      });

      return workspaceAdapter
        .setup()
        .then(() => {
          writeJSONFile('packages/test/package.json', { originalPackageJSON: false });
          writeJSONFile('packages/test/yarn.lock', { originalYarnLock: false });

          return workspaceAdapter.cleanup();
        })
        .then(() => {
          assertFileContainsJSON(path.join(tmpdir, 'packages/test/package.json'), {
            originalPackageJSON: true,
          });
          assertFileContainsJSON(path.join(tmpdir, 'packages/test/yarn.lock'), {
            originalYarnLock: true,
          });
        });
    });
  });

  describe('#changeToDependencySet', () => {
    let workspaceAdapter;

    beforeEach(() => {
      fs.ensureDirSync('packages/test/node_modules');
      writeJSONFile('packages/test/package.json', {
        devDependencies: { 'ember-feature-flags': '1.0.0' },
        dependencies: { 'ember-cli-babel': '5.0.0' },
        peerDependencies: { 'ember-cli-sass': '1.2.3' },
        resolutions: { 'ember-data': '3.0.0' },
      });

      workspaceAdapter = new WorkspaceAdapter({
        cwd: tmpdir,
        packageManager: 'yarn',
        run: () => Promise.resolve(),
      });

      return workspaceAdapter.setup();
    });

    it('changes specified dependency versions', () => {
      return workspaceAdapter
        .changeToDependencySet({
          dependencies: { 'ember-cli-babel': '6.0.0' },
        })
        .then(() => {
          assertFileContainsJSON(path.join(tmpdir, 'packages/test/package.json'), {
            devDependencies: { 'ember-feature-flags': '1.0.0' },
            dependencies: { 'ember-cli-babel': '6.0.0' },
            peerDependencies: { 'ember-cli-sass': '1.2.3' },
            resolutions: { 'ember-data': '3.0.0' },
          });
        });
    });

    it('changes specified npm dev dependency versions', () => {
      return workspaceAdapter
        .changeToDependencySet({
          devDependencies: { 'ember-feature-flags': '2.0.1' },
        })
        .then(() => {
          assertFileContainsJSON(path.join(tmpdir, 'packages/test/package.json'), {
            devDependencies: { 'ember-feature-flags': '2.0.1' },
            dependencies: { 'ember-cli-babel': '5.0.0' },
            peerDependencies: { 'ember-cli-sass': '1.2.3' },
            resolutions: { 'ember-data': '3.0.0' },
          });
        });
    });

    it('changes specified npm peer dependency versions', () => {
      return workspaceAdapter
        .changeToDependencySet({
          peerDependencies: { 'ember-cli-sass': '4.5.6' },
        })
        .then(() => {
          assertFileContainsJSON(path.join(tmpdir, 'packages/test/package.json'), {
            devDependencies: { 'ember-feature-flags': '1.0.0' },
            dependencies: { 'ember-cli-babel': '5.0.0' },
            peerDependencies: { 'ember-cli-sass': '4.5.6' },
            resolutions: { 'ember-data': '3.0.0' },
          });
        });
    });

    it('changes specified resolution versions', () => {
      return workspaceAdapter
        .changeToDependencySet({
          resolutions: { 'ember-data': '3.5.0' },
        })
        .then(() => {
          assertFileContainsJSON('packages/test/package.json', {
            devDependencies: { 'ember-feature-flags': '1.0.0' },
            dependencies: { 'ember-cli-babel': '5.0.0' },
            peerDependencies: { 'ember-cli-sass': '1.2.3' },
            resolutions: { 'ember-data': '3.5.0' },
          });
        });
    });

    it('changes specified ember properties', () => {
      return workspaceAdapter
        .changeToDependencySet({
          ember: { edition: 'octane' },
        })
        .then(() => {
          assertFileContainsJSON('packages/test/package.json', {
            devDependencies: { 'ember-feature-flags': '1.0.0' },
            dependencies: { 'ember-cli-babel': '5.0.0' },
            peerDependencies: { 'ember-cli-sass': '1.2.3' },
            resolutions: { 'ember-data': '3.0.0' },
            ember: { edition: 'octane' },
          });
        });
    });

    it('can remove a package', () => {
      return workspaceAdapter
        .changeToDependencySet({
          devDependencies: { 'ember-feature-flags': null },
        })
        .then(() => {
          assertFileContainsJSON(path.join(tmpdir, 'packages/test/package.json'), {
            devDependencies: {},
            dependencies: { 'ember-cli-babel': '5.0.0' },
            peerDependencies: { 'ember-cli-sass': '1.2.3' },
            resolutions: { 'ember-data': '3.0.0' },
          });
        });
    });

    it('passes the scenario into buildManagerOptions to run with the correct options', () => {
      let runCount = 0;
      workspaceAdapter.run = generateMockRun(
        [
          {
            command: 'yarn install --flat',
            callback(command, args, opts) {
              runCount++;
              expect(opts).to.have.property('cwd', tmpdir);
              return Promise.resolve();
            },
          },
        ],
        { allowPassthrough: false },
      );
      workspaceAdapter.buildManagerOptions = function (scenario) {
        if (scenario.name === 'scenario1') {
          return ['--flat'];
        }

        return [];
      };

      return workspaceAdapter
        .changeToDependencySet({
          name: 'scenario1',
        })
        .then(() => {
          expect(runCount).to.equal(
            1,
            'yarn install should run with correct options from buildManagerOptions',
          );
        });
    });
  });
});
