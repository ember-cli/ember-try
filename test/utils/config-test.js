'use strict';

const expect = require('chai').expect;
const fs = require('fs-extra');
const path = require('path');
const tmp = require('tmp-sync');
const fixturePackage = require('../fixtures/package.json');
const writeJSONFile = require('../helpers/write-json-file');
const getConfig = require('../../lib/utils/config');

const root = process.cwd();
const tmproot = path.join(root, 'tmp');

describe('utils/config', () => {
  let project;
  let tmpdir;

  beforeEach(() => {
    tmpdir = tmp.in(tmproot);
    process.chdir(tmpdir);
    project = { root: tmpdir, pkg: {} };
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

    return getConfig({ project, configPath: 'config/non-default.js' }).then((config) => {
      expect(config.scenarios).to.have.lengthOf(1);
      expect(config.scenarios[0].qux).to.equal('baz');
    });
  });

  it('uses projects configured configPath if present', async () => {
    generateConfigFile(
      'module.exports = { scenarios: [ { foo: "bar" }] };',
      'other-path/ember-try.js',
    );

    project.pkg['ember-addon'] = {
      configPath: 'other-path',
    };

    let config = await getConfig({ project });

    expect(config.scenarios).to.have.lengthOf(1);
    expect(config.scenarios[0].foo).to.equal('bar');
  });

  it('falls back to config/ember-try.js if projects configured configPath is not present', async () => {
    generateConfigFile('module.exports = { scenarios: [ { foo: "bar" }] };');

    project.pkg['ember-addon'] = {
      configPath: 'other-path',
    };

    let config = await getConfig({ project });

    expect(config.scenarios).to.have.lengthOf(1);
    expect(config.scenarios[0].foo).to.equal('bar');
  });

  it('uses projects config/ember-try.js if present', () => {
    generateConfigFile('module.exports = { scenarios: [ { foo: "bar" }] };');

    return getConfig({ project }).then((config) => {
      expect(config.scenarios).to.have.lengthOf(1);
      expect(config.scenarios[0].foo).to.equal('bar');
    });
  });

  it('config file can export a function', () => {
    generateConfigFile('module.exports =  function() { return { scenarios: [ { foo: "bar" }] } };');

    return getConfig({ project }).then((config) => {
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
    return getConfig({ project }).then((config) => {
      expect(config.scenarios).to.have.lengthOf(1);
      expect(config.scenarios[0].bar).to.equal('baz');
    });
  });

  it('config file exporting a function is passed the project', () => {
    generateConfigFile(
      'module.exports =  function(project) { return { scenarios: [ { foo: project.blah }] } };',
    );

    project.blah = 'passed-in';
    return getConfig({ project }).then((config) => {
      expect(config.scenarios).to.have.lengthOf(1);
      expect(config.scenarios[0].foo).to.equal('passed-in');
    });
  });

  it('throws error if project.root/config/ember-try.js is not present and no versionCompatibility', () => {
    return getConfig({ project }).catch((error) => {
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

    return getConfig({ project, configPath: 'config/non-default.js' }).then((config) => {
      expect(config.scenarios).to.have.lengthOf(1);
      expect(config.scenarios[0].qux).to.equal('baz');
    });
  });

  describe('versionCompatibility', () => {
    beforeEach(() => {
      writePackageJSONWithVersionCompatibility();
    });

    it('is used if there is no config file', () => {
      return getConfig({ project }).then((config) => {
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
      return getConfig({ project, versionCompatibility: { ember: '2.18.0' } }).then((config) => {
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
      return getConfig({ project, versionCompatibility: { ember: '2.18.0' } }).then((config) => {
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

      return getConfig({ project }).then((config) => {
        expect(config.scenarios).to.have.lengthOf(1);
        expect(config.scenarios[0].foo).to.equal('bar');
      });
    });

    it('is merged with config if config does not have scenarios', () => {
      generateConfigFile('module.exports = { npmOptions: ["--some-thing=true"] };');
      return getConfig({ project }).then((config) => {
        expect(config.npmOptions).to.eql(['--some-thing=true']);
        expect(config.scenarios.length).to.equal(5);
      });
    });

    it('is merged with config if config has useVersionCompatibility', () => {
      generateConfigFile(
        'module.exports = { useVersionCompatibility: true, npmOptions: ["--whatever=true"], scenarios: [ { name: "bar" }, { name: "ember-beta", allowedToFail: false } ] };',
      );
      return getConfig({ project }).then((config) => {
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

      return getConfig({ configPath: 'config/use-pnpm.js', project }).then((config) => {
        expect(config.usePnpm).to.be.undefined;
        expect(config.packageManager).to.be.equal('pnpm');
      });
    });

    it("replaces `useYarn` with `packageManager: 'yarn'`", () => {
      generateConfigFile(
        'module.exports = { useYarn: true, scenarios: [] };',
        'config/use-yarn.js',
      );

      return getConfig({ configPath: 'config/use-yarn.js', project }).then((config) => {
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
