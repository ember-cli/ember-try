'use strict';

const path = require('path');
const fs = require('fs-extra');
const tmp = require('tmp-sync');
const expect = require('chai').expect;
const DependencyManagerAdapterFactory = require('../../lib/utils/dependency-manager-adapter-factory');
const WorkspaceAdapter = require('../../lib/dependency-manager-adapters/workspace');
let writeJSONFile = require('../helpers/write-json-file');

const ROOT = process.cwd();
let tmproot = path.join(ROOT, 'tmp');

describe('DependencyManagerAdapterFactory', () => {
  let tmpdir;

  beforeEach(() => {
    tmpdir = tmp.in(tmproot);
    process.chdir(tmpdir);
  });

  afterEach(() => {
    process.chdir(ROOT);

    return fs.remove(tmproot);
  });

  describe('generateFromConfig', () => {
    it('creates both adapters, in order, when there is only an npm key', () => {
      let adapters = DependencyManagerAdapterFactory.generateFromConfig({ scenarios: [{ npm: {} }] }, 'here');
      expect(adapters[0].configKey).to.equal('npm');
      expect(adapters[1].configKey).to.equal('bower');
      expect(adapters.length).to.equal(2);
    });

    it('creates both adapters, in order, when there is only a bower key', () => {
      let adapters = DependencyManagerAdapterFactory.generateFromConfig({ scenarios: [{ bower: {} }] }, 'here');
      expect(adapters[0].configKey).to.equal('npm');
      expect(adapters[1].configKey).to.equal('bower');
      expect(adapters.length).to.equal(2);
    });

    it('creates both adapters, in order, when both keys are present', () => {
      let adapters = DependencyManagerAdapterFactory.generateFromConfig({ scenarios: [{ bower: {}, npm: {} }] }, 'here');
      expect(adapters[0].configKey).to.equal('npm');
      expect(adapters[1].configKey).to.equal('bower');
      expect(adapters.length).to.equal(2);
    });

    it('creates both adapters, in order, when there is only a legacy top-level dependencies', () => {
      let adapters = DependencyManagerAdapterFactory.generateFromConfig({ scenarios: [{ dependencies: {} }] }, 'here');
      expect(adapters[0].configKey).to.equal('npm');
      expect(adapters[1].configKey).to.equal('bower');
      expect(adapters.length).to.equal(2);
    });

    it('creates both adapters, in order, when there is only a legacy top-level devDependencies', () => {
      let adapters = DependencyManagerAdapterFactory.generateFromConfig({ scenarios: [{ devDependencies: {} }] }, 'here');
      expect(adapters[0].configKey).to.equal('npm');
      expect(adapters[1].configKey).to.equal('bower');
      expect(adapters.length).to.equal(2);
    });

    it('creates only a workspace adapter when useWorkspaces is set to true', () => {
      writeJSONFile('package.json', { workspaces: ['packages/test'] });

      fs.ensureDirSync('packages/test');
      writeJSONFile('packages/test/package.json', {});

      let adapters = DependencyManagerAdapterFactory.generateFromConfig(
        {
          useYarn: true,
          useWorkspaces: true,
          scenarios: [{ npm: {} }]
        },
        tmpdir
      );
      expect(adapters[0]).to.be.instanceOf(WorkspaceAdapter);
      expect(adapters.length).to.equal(1);
    });

    it('throws an error when attempting to use workspaces with bower dependencies', () => {
      expect(() => {
        DependencyManagerAdapterFactory.generateFromConfig({
          useYarn: true,
          useWorkspaces: true,
          scenarios: [{ bower: {} }]
        });
      }).to.throw(/bower is not supported when using workspaces/);
    });
  });
});
