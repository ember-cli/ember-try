import { expect } from 'chai';
import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp-sync';
import writeJSONFile from '../helpers/write-json-file.js';
import getConfig from '../../lib/utils/config.js';

const fixturePackage = fs.readJsonSync('./test/fixtures/package.json');

const root = process.cwd();
const tmproot = path.join(root, 'tmp');

describe('utils/config', () => {
  let cwd;

  beforeEach(() => {
    cwd = tmp.in(tmproot);
    process.chdir(cwd);
  });

  afterEach(() => {
    process.chdir(root);
    return fs.remove(tmproot);
  });

  function generateConfigFile(contents, filename = 'config/ember-try.js') {
    let directory = path.dirname(filename);
    fs.mkdirsSync(directory);

    fs.writeFileSync(filename, contents, { encoding: 'utf8' });
  }

  it('uses specified options.configFile if present', () => {
    generateConfigFile(
      'module.exports = { scenarios: [ { qux: "baz" }] };',
      'config/non-default.js',
    );

    return getConfig({ configPath: 'config/non-default.js', cwd }).then((config) => {
      expect(config.scenarios).to.have.lengthOf(1);
      expect(config.scenarios[0].qux).to.equal('baz');
    });
  });

  it('uses projects configured configPath if present', async () => {
    generateConfigFile(
      'module.exports = { scenarios: [ { foo: "bar" }] };',
      'other-path/ember-try.js',
    );

    fs.writeJsonSync('package.json', { 'ember-addon': { configPath: 'other-path' } });

    let config = await getConfig({ cwd });

    expect(config.scenarios).to.have.lengthOf(1);
    expect(config.scenarios[0].foo).to.equal('bar');
  });

  it('falls back to config/ember-try.js if projects configured configPath is not present', async () => {
    generateConfigFile('module.exports = { scenarios: [ { foo: "bar" }] };');

    fs.writeJsonSync('package.json', { 'ember-addon': { configPath: 'other-path' } });

    let config = await getConfig({ cwd });

    expect(config.scenarios).to.have.lengthOf(1);
    expect(config.scenarios[0].foo).to.equal('bar');
  });

  it('uses projects config/ember-try.js if present', () => {
    generateConfigFile('module.exports = { scenarios: [ { foo: "bar" }] };');

    return getConfig({ cwd }).then((config) => {
      expect(config.scenarios).to.have.lengthOf(1);
      expect(config.scenarios[0].foo).to.equal('bar');
    });
  });

  it('config file can export a function', () => {
    generateConfigFile('module.exports =  function() { return { scenarios: [ { foo: "bar" }] } };');

    return getConfig({ cwd }).then((config) => {
      expect(config.scenarios).to.have.lengthOf(1);
      expect(config.scenarios[0].foo).to.equal('bar');
    });
  });

  it('config file can return a promise', () => {
    let configFile =
      'module.exports = function() {' +
      '  return new Promise(function (resolve) {' +
      '    var scenarios = [' +
      '      { bar: "baz" }' +
      '    ];' +
      '    resolve({ scenarios: scenarios });' +
      '  });' +
      '};';
    generateConfigFile(configFile);
    return getConfig({ cwd }).then((config) => {
      expect(config.scenarios).to.have.lengthOf(1);
      expect(config.scenarios[0].bar).to.equal('baz');
    });
  });

  it('throws error if project.root/config/ember-try.js is not present and no versionCompatibility', () => {
    return getConfig({ cwd }).catch((error) => {
      expect(error).to.match(
        /No ember-try configuration found\. Please see the README for configuration options/,
      );
    });
  });

  it('uses specified options.configFile over project config/ember-try.js', () => {
    generateConfigFile(
      'module.exports = { scenarios: [ { qux: "baz" }] };',
      'config/non-default.js',
    );
    generateConfigFile('module.exports = { scenarios: [ { foo: "bar" }] };'); // Should not be used

    return getConfig({ configPath: 'config/non-default.js', cwd }).then((config) => {
      expect(config.scenarios).to.have.lengthOf(1);
      expect(config.scenarios[0].qux).to.equal('baz');
    });
  });

  describe('versionCompatibility', () => {
    beforeEach(() => {
      writePackageJSONWithVersionCompatibility();
    });

    it('is used if there is no config file', () => {
      return getConfig({ cwd }).then((config) => {
        let scenarios = config.scenarios;
        expect(scenarios.length).to.equal(5);
        expect(scenarios).to.include.deep.members([
          { name: 'default', npm: { devDependencies: {} } },
          {
            name: 'ember-2.18.0',
            npm: { devDependencies: { 'ember-source': '2.18.0' } },
          },
        ]);

        let scenarioNames = scenarios.map((s) => {
          return s.name;
        });
        expect(scenarioNames).to.include.members(['ember-beta', 'ember-release', 'ember-canary']);
      });
    });

    it('is always used if passed in and behaves as if config file has "useVersionCompatibility: true"', () => {
      generateConfigFile('module.exports = { scenarios: [ { foo: "bar" }] };');
      return getConfig({ cwd, versionCompatibility: { ember: '2.18.0' } }).then((config) => {
        let scenarios = config.scenarios;
        expect(scenarios.length).to.equal(6);
        expect(scenarios).to.include.deep.members([
          { name: 'default', npm: { devDependencies: {} } },
          {
            name: 'ember-2.18.0',
            npm: { devDependencies: { 'ember-source': '2.18.0' } },
          },
          { foo: 'bar' },
        ]);
      });
    });

    it('can be overridden by passed in versionCompatibility', () => {
      return getConfig({ cwd, versionCompatibility: { ember: '2.18.0' } }).then((config) => {
        let scenarios = config.scenarios;
        expect(scenarios.length).to.equal(5);
        expect(scenarios).to.include.deep.members([
          { name: 'default', npm: { devDependencies: {} } },
          {
            name: 'ember-2.18.0',
            npm: { devDependencies: { 'ember-source': '2.18.0' } },
          },
        ]);
      });
    });

    it('is ignored if config file has scenarios', () => {
      generateConfigFile('module.exports = { scenarios: [ { foo: "bar" }] };');

      return getConfig({ cwd }).then((config) => {
        expect(config.scenarios).to.have.lengthOf(1);
        expect(config.scenarios[0].foo).to.equal('bar');
      });
    });

    it('is merged with config if config does not have scenarios', () => {
      generateConfigFile('module.exports = { npmOptions: ["--some-thing=true"] };');
      return getConfig({ cwd }).then((config) => {
        expect(config.npmOptions).to.eql(['--some-thing=true']);
        expect(config.scenarios.length).to.equal(5);
      });
    });

    it('is merged with config if config has useVersionCompatibility', () => {
      generateConfigFile(
        'module.exports = { useVersionCompatibility: true, npmOptions: ["--whatever=true"], scenarios: [ { name: "bar" }, { name: "ember-beta", allowedToFail: false } ] };',
      );
      return getConfig({ cwd }).then((config) => {
        expect(config.useVersionCompatibility).to.equal(true);
        expect(config.npmOptions).to.eql(['--whatever=true']);
        expect(config.scenarios.length).to.equal(6);
        expect(config.scenarios).to.include.deep.members([
          {
            name: 'default',
            npm: { devDependencies: {} },
          },
          {
            name: 'ember-2.18.0',
            npm: { devDependencies: { 'ember-source': '2.18.0' } },
          },
          { name: 'bar' },
        ]);

        let betaScenario = config.scenarios.find((s) => {
          return s.name === 'ember-beta';
        });
        expect(betaScenario.allowedToFail).to.equal(false);
      });
    });
  });

  describe('old package-manager options', () => {
    it("replaces `usePnpm` with `packageManager: 'pnpm'`", () => {
      generateConfigFile(
        'module.exports = { usePnpm: true, scenarios: [] };',
        'config/use-pnpm.js',
      );

      return getConfig({ configPath: 'config/use-pnpm.js', cwd }).then((config) => {
        expect(config.usePnpm).to.be.undefined;
        expect(config.packageManager).to.be.equal('pnpm');
      });
    });

    it("replaces `useYarn` with `packageManager: 'yarn'`", () => {
      generateConfigFile(
        'module.exports = { useYarn: true, scenarios: [] };',
        'config/use-yarn.js',
      );

      return getConfig({ configPath: 'config/use-yarn.js', cwd }).then((config) => {
        expect(config.useYarn).to.be.undefined;
        expect(config.packageManager).to.be.equal('yarn');
      });
    });
  });
});

function writePackageJSONWithVersionCompatibility() {
  fixturePackage['ember-addon'] = { versionCompatibility: { ember: '=2.18.0' } };
  writeJSONFile('package.json', fixturePackage);
}
