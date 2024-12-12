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
    it('creates the adapter', () => {
      let adapters = DependencyManagerAdapterFactory.generateFromConfig(
        { scenarios: [{ npm: {} }] },
        'here',
      );
      expect(adapters[0].configKey).to.equal('npm');
      expect(adapters.length).to.equal(1);
    });

    it('creates only a workspace adapter when useWorkspaces is set to true', () => {
      writeJSONFile('package.json', { workspaces: ['packages/test'] });

      fs.ensureDirSync('packages/test');
      writeJSONFile('packages/test/package.json', {});

      let adapters = DependencyManagerAdapterFactory.generateFromConfig(
        {
          packageManager: 'yarn',
          useWorkspaces: true,
          scenarios: [{ npm: {} }],
        },
        tmpdir,
      );
      expect(adapters[0]).to.be.instanceOf(WorkspaceAdapter);
      expect(adapters.length).to.equal(1);
    });
  });
});
