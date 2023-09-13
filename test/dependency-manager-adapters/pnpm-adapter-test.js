'use strict';

let expect = require('chai').expect;
let fs = require('fs-extra');
let path = require('path');
let tmp = require('tmp-sync');
const sinon = require('sinon');
let PnpmAdapter = require('../../lib/dependency-manager-adapters/pnpm');
let generateMockRun = require('../helpers/generate-mock-run');

let root = process.cwd();
let tmproot = path.join(root, 'tmp');
let tmpdir;

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
    it('backs up the `package.json` and `pnpm-lock.yaml` files', async () => {
      await fs.outputJson('package.json', { originalPackageJSON: true });
      await fs.outputFile('pnpm-lock.yaml', 'originalYAML: true\n');

      let adapter = new PnpmAdapter({ cwd: tmpdir });
      await adapter.setup();

      expect(await fs.readJson(adapter.backup.pathForFile('package.json'))).to.deep.equal({
        originalPackageJSON: true,
      });
      expect(await fs.readFile(adapter.backup.pathForFile('pnpm-lock.yaml'), 'utf-8')).to.equal(
        'originalYAML: true\n'
      );
    });

    it('ignores missing `pnpm-lock.yaml` files', async () => {
      await fs.outputJson('package.json', { originalPackageJSON: true });

      let adapter = new PnpmAdapter({ cwd: tmpdir });
      await adapter.setup();

      expect(await fs.readJson(adapter.backup.pathForFile('package.json'))).to.deep.equal({
        originalPackageJSON: true,
      });
      expect(fs.existsSync(adapter.backup.pathForFile('pnpm-lock.yaml'))).to.be.false;
    });
  });

  describe('#changeToDependencySet', () => {
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
            command: 'pnpm install --no-lockfile',
            async callback(command, args, opts) {
              runCount++;
              expect(opts).to.have.property('cwd', tmpdir);
            },
          },
        ],
        { allowPassthrough: false }
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

    it('runs _updateNpmRc before _install', async () => {
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
        '_updateNpmRc',
        sinon.fake(() => {})
      );

      const installStub = sinon.replace(
        adapter,
        '_install',
        sinon.fake(() => {})
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
    it('restores the `package.json` and `pnpm-lock.yaml` files, and then runs `pnpm install`', async () => {
      await fs.outputJson('package.json', { originalPackageJSON: true });
      await fs.outputFile('pnpm-lock.yaml', 'originalYAML: true\n');

      let runCount = 0;
      let stubbedRun = generateMockRun(
        [
          {
            command: 'pnpm install --no-lockfile',
            async callback(command, args, opts) {
              runCount++;
              expect(opts).to.have.property('cwd', tmpdir);
            },
          },
        ],
        { allowPassthrough: false }
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

    it('runs _revertNpmRc after _install', async () => {
      await fs.outputJson('package.json', { modifiedPackageJSON: true });
      await fs.outputJson('package.json.ember-try', { originalPackageJSON: true });
      await fs.outputFile('pnpm-lock.yaml', 'modifiedYAML: true\n');
      await fs.outputFile('pnpm-lock.ember-try.yaml', 'originalYAML: true\n');

      let adapter = new PnpmAdapter({
        cwd: tmpdir,
      });

      const revertStub = sinon.replace(
        adapter,
        '_revertNpmRc',
        sinon.fake(() => {})
      );

      const installStub = sinon.replace(
        adapter,
        '_install',
        sinon.fake(() => {})
      );

      await adapter.cleanup();

      expect(revertStub.calledAfter(installStub)).to.be.true;
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

  describe('#_doesPnpmRequireResolutionModeFix', () => {
    [
      { given: null, expected: false },
      { given: '1.0.0', expected: false },
      { given: '7.9.9999', expected: false },
      { given: '8.0.0', expected: true },
      { given: '8.1.2', expected: true },
      { given: '8.6.9999', expected: true },
      { given: '8.7.0', expected: false },
      { given: '8.7.1', expected: false },
      { given: '9.0.0', expected: false },
    ].forEach(({ given, expected }) => {
      it(`works with given version "${given}"`, () => {
        let npmAdapter = new PnpmAdapter({ cwd: tmpdir });
        let result = npmAdapter._doesPnpmRequireResolutionModeFix(given);
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
        let npmAdapter = new PnpmAdapter({ cwd: tmpdir });
        let result = await npmAdapter._getPnpmVersion(`echo ${version}`);
        expect(result).equal(version);
      });
    });
  });

  describe('#_updateNpmRc', () => {
    describe('when pnpm version requires the resolution-mode fix', () => {
      it(`should create a new .npmrc file when none exists`, async () => {
        let npmAdapter = new PnpmAdapter({ cwd: tmpdir });
        let npmrcPath = path.join(tmpdir, '.npmrc');
        let npmrcBackupPath = path.join(tmpdir, '.npmrc.ember-try');

        await npmAdapter._updateNpmRc('8.6.0');

        let actualFileContent = fs.readFileSync(npmrcPath, 'utf8');
        let expectedFileContent = 'resolution-mode = highest\n';

        expect(actualFileContent, '.npmrc content').to.equal(expectedFileContent);
        expect(fs.existsSync(npmrcBackupPath), '.npmrc.ember-try does not exist').to.be.false;
      });

      it(`should update an npmrc file when it already exists`, async () => {
        let npmAdapter = new PnpmAdapter({ cwd: tmpdir });
        let npmrcPath = path.join(tmpdir, '.npmrc');
        let npmrcBackupPath = npmAdapter.backup.pathForFile('.npmrc');

        fs.writeFileSync(npmrcPath, 'foo = bar\n');

        await npmAdapter._updateNpmRc('8.6.0');

        let actualFileContent = fs.readFileSync(npmrcPath, 'utf8');
        let expectedFileContent = 'foo = bar\n\nresolution-mode = highest\n';
        expect(actualFileContent, '.npmrc content').to.equal(expectedFileContent);

        let actualBackupFileContent = fs.readFileSync(npmrcBackupPath, 'utf8');
        let expectedBackupFileContent = 'foo = bar\n';
        expect(actualBackupFileContent, '.npmrc-backup content').to.equal(
          expectedBackupFileContent
        );
      });
    });

    describe('when pnpm version does not the resolution-mode fix', () => {
      it(`should not create a new .npmrc file`, async () => {
        let npmAdapter = new PnpmAdapter({ cwd: tmpdir });
        let npmrcPath = path.join(tmpdir, '.npmrc');
        let npmrcBackupPath = path.join(tmpdir, '.npmrc.ember-try');

        await npmAdapter._updateNpmRc('7.6.0');

        expect(fs.existsSync(npmrcPath), '.npmrc does not exist').to.be.false;
        expect(fs.existsSync(npmrcBackupPath), '.npmrc.ember-try does not exist').to.be.false;
      });
    });
  });

  describe('#_revertNpmRc', () => {
    describe('when pnpm version requires the resolution-mode fix', () => {
      it(`when backup does not exist, it should delete the .npmrc file`, async () => {
        let npmAdapter = new PnpmAdapter({ cwd: tmpdir });
        let npmrcPath = path.join(tmpdir, '.npmrc');
        let npmrcBackupPath = path.join(tmpdir, '.npmrc.ember-try');

        fs.writeFileSync(npmrcPath, 'resolution-mode = highest\n');

        await npmAdapter._revertNpmRc('8.6.0');

        expect(fs.existsSync(npmrcPath), '.npmrc.ember-try does not exist').to.be.false;
        expect(fs.existsSync(npmrcBackupPath), '.npmrc.ember-try does not exist').to.be.false;
      });

      it(`when backup exists, it should replace the original file with backup and delete the backup`, async () => {
        let npmAdapter = new PnpmAdapter({ cwd: tmpdir });
        let npmrcPath = path.join(tmpdir, '.npmrc');
        let npmrcBackupPath = npmAdapter.backup.pathForFile('.npmrc');

        fs.writeFileSync(npmrcPath, 'foo = bar\n\nresolution-mode = highest\n');
        fs.writeFileSync(npmrcBackupPath, 'foo = bar\n');

        await npmAdapter._revertNpmRc('8.6.0');

        let actualFileContent = fs.readFileSync(npmrcPath, 'utf8');
        let expectedFileContent = 'foo = bar\n';

        expect(actualFileContent, '.npmrc content').to.equal(expectedFileContent);
        // expect(fs.existsSync(npmrcBackupPath), '.npmrc.ember-try existence').to.be.false;
      });
    });

    describe('when pnpm version does not the resolution-mode fix', () => {
      it(`should not touch the existing .npmrc file`, async () => {
        let npmAdapter = new PnpmAdapter({ cwd: tmpdir });
        let npmrcPath = path.join(tmpdir, '.npmrc');
        let npmrcBackupPath = path.join(tmpdir, '.npmrc.ember-try');

        fs.writeFileSync(npmrcPath, 'foo = bar\n');

        await npmAdapter._revertNpmRc('7.6.0');

        let actualFileContent = fs.readFileSync(npmrcPath, 'utf8');

        expect(actualFileContent, '.npmrc content').to.equal('foo = bar\n');
        expect(fs.existsSync(npmrcBackupPath), '.npmrc.ember-try does not exist').to.be.false;
      });
    });
  });
});
