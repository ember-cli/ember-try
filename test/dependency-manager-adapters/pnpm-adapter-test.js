'use strict';

let chai = require('chai');
let chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
let { expect } = chai;
let fs = require('fs-extra');
let path = require('path');
let tmp = require('tmp-sync');
const sinon = require('sinon');
let PnpmAdapter = require('../../lib/dependency-manager-adapters/pnpm');
let generateMockRun = require('../helpers/generate-mock-run');

let root = process.cwd();
let tmproot = path.join(root, 'tmp');
let tmpdir;

function setResolutionModeToHighest(dir) {
  // package.json is required for `pnpm config get` to work
  let packageJsonPath = path.join(dir, 'package.json');
  fs.writeFileSync(packageJsonPath, '{"private": true}');

  let npmrcPath = path.join(dir, '.npmrc');
  fs.writeFileSync(npmrcPath, 'resolution-mode = highest');
}

describe('pnpm Adapter', () => {
  beforeEach(() => {
    tmpdir = tmp.in(tmproot);
    process.chdir(tmpdir);
  });

  afterEach(async () => {
    sinon.restore();
    process.chdir(root);
    await fs.remove(tmproot);
  });

  describe('#setup', () => {
    beforeEach(() => {
      setResolutionModeToHighest(tmpdir);
    });

    it('backs up the `package.json` and `pnpm-lock.yaml` files', async () => {
      await fs.outputJson('package.json', { originalPackageJSON: true });
      await fs.outputFile('pnpm-lock.yaml', 'originalYAML: true\n');

      let stubbedRun = generateMockRun(
        [
          {
            command: 'pnpm --version',
            async callback(/* command, args, opts */) {
              return { stdout: '9.0.0\n' };
            },
          },
          {
            command: 'pnpm config get resolution-mode',
            async callback(/* command, args, opts */) {
              return { stdout: 'highest\n' };
            },
          },
        ],
        { allowPassthrough: false },
      );

      let adapter = new PnpmAdapter({ cwd: tmpdir, run: stubbedRun });
      await adapter.setup();

      expect(await fs.readJson(adapter.backup.pathForFile('package.json'))).to.deep.equal({
        originalPackageJSON: true,
      });
      expect(await fs.readFile(adapter.backup.pathForFile('pnpm-lock.yaml'), 'utf-8')).to.equal(
        'originalYAML: true\n',
      );
    });

    it('ignores missing `pnpm-lock.yaml` files', async () => {
      await fs.outputJson('package.json', { originalPackageJSON: true });

      let stubbedRun = generateMockRun(
        [
          {
            command: 'pnpm --version',
            async callback(/* command, args, opts */) {
              return { stdout: '9.0.0\n' };
            },
          },
          {
            command: 'pnpm config get resolution-mode',
            async callback(/* command, args, opts */) {
              return { stdout: 'highest\n' };
            },
          },
        ],
        { allowPassthrough: false },
      );

      let adapter = new PnpmAdapter({ cwd: tmpdir, run: stubbedRun });
      await adapter.setup();

      expect(await fs.readJson(adapter.backup.pathForFile('package.json'))).to.deep.equal({
        originalPackageJSON: true,
      });
      expect(fs.existsSync(adapter.backup.pathForFile('pnpm-lock.yaml'))).to.be.false;
    });
  });

  describe('#changeToDependencySet', () => {
    beforeEach(() => {
      setResolutionModeToHighest(tmpdir);
    });

    it('updates the `package.json` and runs `pnpm install`', async () => {
      await fs.outputJson('package.json', {
        devDependencies: {
          'ember-try-test-suite-helper': '0.1.0',
        },
      });

      let runCount = 0;
      let stubbedRun = generateMockRun(
        [
          {
            command: 'pnpm install --no-lockfile --ignore-scripts',
            async callback(command, args, opts) {
              runCount++;
              expect(opts).to.have.property('cwd', tmpdir);
            },
          },
          {
            command: 'pnpm --version',
            async callback(/* command, args, opts */) {
              return { stdout: '9.0.0\n' };
            },
          },
          {
            command: 'pnpm config get resolution-mode',
            async callback(/* command, args, opts */) {
              return { stdout: 'highest\n' };
            },
          },
        ],
        { allowPassthrough: false },
      );

      let adapter = new PnpmAdapter({
        cwd: tmpdir,
        run: stubbedRun,
      });

      await adapter.setup();
      let result = await adapter.changeToDependencySet({
        devDependencies: {
          'ember-try-test-suite-helper': '1.0.0',
        },
      });

      expect(result).to.deep.equal([
        {
          name: 'ember-try-test-suite-helper',
          packageManager: 'pnpm',
          versionExpected: '1.0.0',
          versionSeen: null,
        },
      ]);

      expect(await fs.readJson('package.json')).to.deep.equal({
        devDependencies: {
          'ember-try-test-suite-helper': '1.0.0',
        },
      });

      expect(await fs.readJson(adapter.backup.pathForFile('package.json'))).to.deep.equal({
        devDependencies: {
          'ember-try-test-suite-helper': '0.1.0',
        },
      });

      expect(runCount).to.equal(1);
    });

    it('runs _throwOnResolutionMode before _install', async () => {
      await fs.outputJson('package.json', {
        devDependencies: {
          'ember-try-test-suite-helper': '0.1.0',
        },
      });

      let adapter = new PnpmAdapter({
        cwd: tmpdir,
      });

      const updateStub = sinon.replace(
        adapter,
        '_throwOnResolutionMode',
        sinon.fake(() => {}),
      );

      const installStub = sinon.replace(
        adapter,
        '_install',
        sinon.fake(() => {}),
      );

      await adapter.setup();
      await adapter.changeToDependencySet({
        devDependencies: {
          'ember-try-test-suite-helper': '1.0.0',
        },
      });

      expect(updateStub.calledBefore(installStub)).to.be.true;
    });
  });

  describe('#cleanup', () => {
    beforeEach(() => {
      setResolutionModeToHighest(tmpdir);
    });

    it('restores the `package.json` and `pnpm-lock.yaml` files, and then runs `pnpm install`', async () => {
      await fs.outputJson('package.json', { originalPackageJSON: true });
      await fs.outputFile('pnpm-lock.yaml', 'originalYAML: true\n');

      let runCount = 0;
      let stubbedRun = generateMockRun(
        [
          {
            command: 'pnpm install --no-lockfile --ignore-scripts',
            async callback(command, args, opts) {
              runCount++;
              expect(opts).to.have.property('cwd', tmpdir);
            },
          },
          {
            command: 'pnpm --version',
            async callback(/* command, args, opts */) {
              return { stdout: '9.0.0\n' };
            },
          },
          {
            command: 'pnpm config get resolution-mode',
            async callback(/* command, args, opts */) {
              return { stdout: 'highest\n' };
            },
          },
        ],
        { allowPassthrough: false },
      );

      let adapter = new PnpmAdapter({
        cwd: tmpdir,
        run: stubbedRun,
      });

      await adapter.setup();

      // Simulate modifying the files:
      await fs.outputJson('package.json', { originalPackageJSON: false });
      await fs.outputFile('pnpm-lock.yaml', 'originalYAML: false\n');

      await adapter.cleanup();

      expect(await fs.readJson('package.json')).to.deep.equal({ originalPackageJSON: true });
      expect(await fs.readFile('pnpm-lock.yaml', 'utf-8')).to.equal('originalYAML: true\n');

      expect(runCount).to.equal(1);
    });
  });

  describe('#_packageJSONForDependencySet', () => {
    it('changes specified dependency versions', () => {
      let npmAdapter = new PnpmAdapter({ cwd: tmpdir });
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
        let npmAdapter = new PnpmAdapter({
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
        let npmAdapter = new PnpmAdapter({
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
        let npmAdapter = new PnpmAdapter({
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
        let npmAdapter = new PnpmAdapter({
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

    it('adds an override for the specified dependency version', () => {
      let npmAdapter = new PnpmAdapter({
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

      expect(resultJSON.overrides['ember-cli-babel']).to.equal('6.0.0');
    });

    it('removes a dependency from overrides if its version is null', () => {
      let npmAdapter = new PnpmAdapter({
        cwd: tmpdir,
        useYarnCommand: true,
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

    it('doesnt add resolutions if there are none specified', () => {
      let npmAdapter = new PnpmAdapter({
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
      let npmAdapter = new PnpmAdapter({
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
      let npmAdapter = new PnpmAdapter({ cwd: tmpdir });
      let packageJSON = {
        devDependencies: { 'ember-feature-flags': '1.0.0' },
        dependencies: { 'ember-cli-babel': '5.0.0' },
      };
      let depSet = { devDependencies: { 'ember-feature-flags': '2.0.1' } };

      let resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.devDependencies['ember-feature-flags']).to.equal('2.0.1');
    });

    it('changes specified npm peer dependency versions', () => {
      let npmAdapter = new PnpmAdapter({ cwd: tmpdir });
      let packageJSON = { peerDependencies: { 'ember-cli-babel': '5.0.0' } };
      let depSet = { peerDependencies: { 'ember-cli-babel': '4.0.0' } };

      let resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.peerDependencies['ember-cli-babel']).to.equal('4.0.0');
    });

    it('can remove a package', () => {
      let npmAdapter = new PnpmAdapter({ cwd: tmpdir });
      let packageJSON = { devDependencies: { 'ember-feature-flags': '1.0.0' } };
      let depSet = { devDependencies: { 'ember-feature-flags': null } };

      let resultJSON = npmAdapter._packageJSONForDependencySet(packageJSON, depSet);

      expect(resultJSON.devDependencies).to.not.have.property('ember-feature-flags');
    });
  });

  describe('#_isResolutionModeWrong', () => {
    [
      { expected: false, pnpmVersion: '1.0.0', resolutionMode: '' },
      { expected: false, pnpmVersion: '7.9.9999', resolutionMode: '' },
      { expected: true, pnpmVersion: '8.0.0', resolutionMode: '' },
      { expected: true, pnpmVersion: '8.1.2', resolutionMode: '' },
      { expected: true, pnpmVersion: '8.6.9999', resolutionMode: '' },
      { expected: false, pnpmVersion: '8.7.0', resolutionMode: '' },
      { expected: false, pnpmVersion: '8.7.1', resolutionMode: '' },
      { expected: false, pnpmVersion: '9.0.0', resolutionMode: '' },
      { expected: false, pnpmVersion: '1.0.0', resolutionMode: 'highest' },
      { expected: false, pnpmVersion: '7.9.9999', resolutionMode: 'highest' },
      { expected: false, pnpmVersion: '8.0.0', resolutionMode: 'highest' },
      { expected: false, pnpmVersion: '8.1.2', resolutionMode: 'highest' },
      { expected: false, pnpmVersion: '8.6.9999', resolutionMode: 'highest' },
      { expected: false, pnpmVersion: '8.7.0', resolutionMode: 'highest' },
      { expected: false, pnpmVersion: '8.7.1', resolutionMode: 'highest' },
      { expected: false, pnpmVersion: '9.0.0', resolutionMode: 'highest' },
      { expected: false, pnpmVersion: '1.0.0', resolutionMode: 'lowest-direct' },
      { expected: false, pnpmVersion: '7.9.9999', resolutionMode: 'lowest-direct' },
      { expected: false, pnpmVersion: '8.0.0', resolutionMode: 'lowest-direct' },
      { expected: false, pnpmVersion: '8.1.2', resolutionMode: 'lowest-direct' },
      { expected: false, pnpmVersion: '8.6.9999', resolutionMode: 'lowest-direct' },
      { expected: false, pnpmVersion: '8.7.0', resolutionMode: 'lowest-direct' },
      { expected: false, pnpmVersion: '8.7.1', resolutionMode: 'lowest-direct' },
      { expected: false, pnpmVersion: '9.0.0', resolutionMode: 'lowest-direct' },
    ].forEach(({ pnpmVersion, resolutionMode, expected }) => {
      it(`works with given version "${pnpmVersion}" and resolutionMode "${resolutionMode}"`, () => {
        let npmAdapter = new PnpmAdapter({ cwd: tmpdir });

        let result = npmAdapter._isResolutionModeWrong(pnpmVersion, resolutionMode);
        expect(result).equal(expected);
      });
    });
  });

  describe('#_getPnpmVersion', () => {
    // prettier-ignore
    [
      { version: '1.0.0' },
      { version: '8.6.2' },
      { version: 'how the turntables' },
    ].forEach(({ version }) => {
      it(`works with given version "${version}"`, async () => {
        let stubbedRun = generateMockRun(
          [
            {
              command: 'pnpm --version',
              async callback(/* command, args, opts */) {
                return {  stdout: `${version}\n` };
              },
            },
          ],
          { allowPassthrough: false }
        );

        let npmAdapter = new PnpmAdapter({ cwd: tmpdir, run: stubbedRun });
        let result = await npmAdapter._getPnpmVersion();
        expect(result).equal(version);
      });
    });
  });

  describe('#_getResolutionMode', () => {
    it('when no .npmrc is present, it should return an empty string', async () => {
      let stubbedRun = generateMockRun(
        [
          {
            command: 'pnpm config get resolution-mode',
            async callback(/* command, args, opts */) {
              return { stdout: '' };
            },
          },
        ],
        { allowPassthrough: false },
      );

      let npmAdapter = new PnpmAdapter({ cwd: tmpdir, run: stubbedRun });

      let result = await npmAdapter._getResolutionMode();
      expect(result).equal('');
    });

    it('when .npmrc contains reslution-mode, it should return the given resolution mode', async () => {
      let stubbedRun = generateMockRun(
        [
          {
            command: 'pnpm config get resolution-mode',
            async callback(/* command, args, opts */) {
              return { stdout: 'highest\n' };
            },
          },
        ],
        { allowPassthrough: false },
      );

      let npmAdapter = new PnpmAdapter({ cwd: tmpdir, run: stubbedRun });

      setResolutionModeToHighest(tmpdir);

      let result = await npmAdapter._getResolutionMode();
      expect(result).equal('highest');
    });
  });

  describe('#_throwOnResolutionMode', () => {
    describe('when pnpm version requires the resolution-mode fix', () => {
      it(`when resoultion-mode is not highest, should throw an error`, async () => {
        let stubbedRun = generateMockRun(
          [
            {
              command: 'pnpm --version',
              async callback(/* command, args, opts */) {
                return { stdout: '8.6.0\n' };
              },
            },
            {
              command: 'pnpm config get resolution-mode',
              async callback(/* command, args, opts */) {
                return { stdout: '' };
              },
            },
          ],
          { allowPassthrough: false },
        );

        let npmAdapter = new PnpmAdapter({ cwd: tmpdir, run: stubbedRun });

        return expect(npmAdapter._throwOnResolutionMode()).to.eventually.be.rejectedWith(
          'You are using an old version of pnpm that uses wrong resolution mode that violates ember-try expectations. Please either upgrade pnpm or set `resolution-mode` to `highest` in `.npmrc`.',
        );
      });

      it(`when resoultion-mode is highest, should not throw an error`, async () => {
        let stubbedRun = generateMockRun(
          [
            {
              command: 'pnpm --version',
              async callback(/* command, args, opts */) {
                return { stdout: '8.6.0\n' };
              },
            },
            {
              command: 'pnpm config get resolution-mode',
              async callback(/* command, args, opts */) {
                return { stdout: 'highest\n' };
              },
            },
          ],
          { allowPassthrough: false },
        );

        let npmAdapter = new PnpmAdapter({ cwd: tmpdir, run: stubbedRun });

        setResolutionModeToHighest(tmpdir);

        await npmAdapter._throwOnResolutionMode('8.6.0');
      });
    });

    describe('when pnpm version does not the resolution-mode fix', () => {
      it(`should not throw an error`, async () => {
        let stubbedRun = generateMockRun(
          [
            {
              command: 'pnpm --version',
              async callback(/* command, args, opts */) {
                return { stdout: '7.6.0\n' };
              },
            },
            {
              command: 'pnpm config get resolution-mode',
              async callback(/* command, args, opts */) {
                return { stdout: 'highest\n' };
              },
            },
          ],
          { allowPassthrough: false },
        );

        let npmAdapter = new PnpmAdapter({ cwd: tmpdir, run: stubbedRun });

        await npmAdapter._throwOnResolutionMode();
      });
    });
  });
});
