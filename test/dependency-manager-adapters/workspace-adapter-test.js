'use strict';

let expect = require('chai').expect;
let RSVP = require('rsvp');
let fs = require('fs-extra');
let path = require('path');
let tmp = require('tmp-sync');
let fixtureWorkspaces = require('../fixtures/package-with-workspaces.json');
let WorkspaceAdapter = require('../../lib/dependency-manager-adapters/workspace');
let writeJSONFile = require('../helpers/write-json-file');
let assertFileContainsJSON = require('../helpers/assert-file-contains-json');
let generateMockRun = require('../helpers/generate-mock-run');

let remove = RSVP.denodeify(fs.remove);
let root = process.cwd();
let tmproot = path.join(root, 'tmp');
let tmpdir;

describe('workspaceAdapter', () => {
  beforeEach(() => {
    tmpdir = tmp.in(tmproot);
    process.chdir(tmpdir);
    writeJSONFile('package.json', fixtureWorkspaces);
  });

  afterEach(() => {
    process.chdir(root);
    return remove(tmproot);
  });

  describe('#setup', () => {
    it('backs up the package.json file and node_modules of subpackage', () => {
      fs.ensureDirSync('packages/test/node_modules');

      writeJSONFile('packages/test/package.json', { originalPackageJSON: true });
      writeJSONFile('packages/test/node_modules/prove-it.json', { originalNodeModules: true });

      return new WorkspaceAdapter({
        cwd: tmpdir,
        useYarnCommand: true,
      }).setup().then(() => {
        assertFileContainsJSON(path.join(tmpdir, 'packages/test/package.json.ember-try'), { originalPackageJSON: true });
        assertFileContainsJSON(path.join(tmpdir, 'packages/test/.node_modules.ember-try/prove-it.json'), { originalNodeModules: true });
      });
    });

    it('throws an error if workspaces are not present', () => {
      writeJSONFile('package.json', {
        name: 'a-test-project-with-workspaces'
      });

      expect(() => {
        return new WorkspaceAdapter({
          cwd: tmpdir,
          useYarnCommand: true,
        }).setup();
      }).to.throw(/you must define the `workspaces` property in package.json with at least one workspace to use workspaces with ember-try/)
    });
  });

  describe('#_install', () => {
    describe('without yarn', () => {
      it('throws an error', () => {
        expect(() => {
          return new WorkspaceAdapter({
            cwd: tmpdir,
          });
        }).to.throw(/workspaces are currently only supported by Yarn, you must set `useYarn` to true/)
      });
    });

    describe('with yarn', () => {
      it('runs yarn install', () => {
        let runCount = 0;
        let stubbedRun = generateMockRun([{
          command: 'yarn install --no-lockfile --ignore-engines',
          callback(command, args, opts) {
            runCount++;
            expect(opts).to.have.property('cwd', tmpdir);
            return RSVP.resolve();
          },
        }], { allowPassthrough: false });

        return new WorkspaceAdapter({
          cwd: tmpdir,
          run: stubbedRun,
          useYarnCommand: true,
        })._install().then(() => {
          expect(runCount).to.equal(1, 'Only yarn install should run');
        });
      });

      it('uses managerOptions for yarn commands', () => {
        let runCount = 0;
        let stubbedRun = generateMockRun([{
          command: 'yarn install --flat --no-lockfile --ignore-engines',
          callback() {
            runCount++;
            return RSVP.resolve();
          },
        }], { allowPassthrough: false });

        return new WorkspaceAdapter({
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

  describe('#cleanup', () => {
    it('replaces the package.json with the backed up version', () => {
      fs.ensureDirSync('packages/test/node_modules');

      writeJSONFile('packages/test/package.json', { originalPackageJSON: true });
      writeJSONFile('packages/test/node_modules/prove-it.json', { originalNodeModules: true });

      let workspaceAdapter = new WorkspaceAdapter({
        cwd: tmpdir,
        useYarnCommand: true,
        run: () => Promise.resolve(),
      });

      return workspaceAdapter.setup().then(() => {
        writeJSONFile('packages/test/package.json', { originalPackageJSON: false });
        writeJSONFile('packages/test/node_modules/prove-it.json', { originalNodeModules: true });

        return workspaceAdapter.cleanup();
      }).then(() => {
        assertFileContainsJSON(path.join(tmpdir, 'packages/test/package.json'), { originalPackageJSON: true });
        assertFileContainsJSON(path.join(tmpdir, 'packages/test/node_modules/prove-it.json'), { originalNodeModules: true });
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
      });

      workspaceAdapter = new WorkspaceAdapter({
        cwd: tmpdir,
        useYarnCommand: true,
        run: () => Promise.resolve(),
      });

      return workspaceAdapter.setup();
    });

    it('changes specified dependency versions', () => {
      return workspaceAdapter.changeToDependencySet({
        npm: {
          dependencies: { 'ember-cli-babel': '6.0.0' },
        },
      }).then(() => {
        assertFileContainsJSON(path.join(tmpdir, 'packages/test/package.json'), {
          devDependencies: { 'ember-feature-flags': '1.0.0' },
          dependencies: { 'ember-cli-babel': '6.0.0' },
          peerDependencies: { 'ember-cli-sass': '1.2.3' },
        });
      });
    });

    it('changes specified npm dev dependency versions', () => {
      return workspaceAdapter.changeToDependencySet({
        npm: {
          devDependencies: { 'ember-feature-flags': '2.0.1' },
        },
      }).then(() => {
        assertFileContainsJSON(path.join(tmpdir, 'packages/test/package.json'), {
          devDependencies: { 'ember-feature-flags': '2.0.1' },
          dependencies: { 'ember-cli-babel': '5.0.0' },
          peerDependencies: { 'ember-cli-sass': '1.2.3' },
        });
      });
    });

    it('changes specified npm peer dependency versions', () => {
      return workspaceAdapter.changeToDependencySet({
        npm: {
          peerDependencies: { 'ember-cli-sass': '4.5.6' },
        },
      }).then(() => {
        assertFileContainsJSON(path.join(tmpdir, 'packages/test/package.json'), {
          devDependencies: { 'ember-feature-flags': '1.0.0' },
          dependencies: { 'ember-cli-babel': '5.0.0' },
          peerDependencies: { 'ember-cli-sass': '4.5.6' },
        });
      });
    });

    it('can remove a package', () => {
      return workspaceAdapter.changeToDependencySet({
        npm: {
          devDependencies: { 'ember-feature-flags': null },
        },
      }).then(() => {
        assertFileContainsJSON(path.join(tmpdir, 'packages/test/package.json'), {
          devDependencies: {},
          dependencies: { 'ember-cli-babel': '5.0.0' },
          peerDependencies: { 'ember-cli-sass': '1.2.3' },
        });
      });
    });
  });
});
