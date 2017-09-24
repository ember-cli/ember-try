'use strict';

let expect = require('chai').expect;
let RSVP = require('rsvp');
let fs = require('fs-extra');
let path = require('path');
let tmp = require('tmp-sync');
let fixturePackage = require('../fixtures/package.json');
let writeJSONFile = require('../helpers/write-json-file');
let getConfig = require('../../lib/utils/config');
let defaultConfig = getConfig._defaultConfig;

let remove = RSVP.denodeify(fs.remove);
let root = process.cwd();
let tmproot = path.join(root, 'tmp');
let tmpdir;

describe('utils/config', () => {
  let project;

  beforeEach(() => {
    tmpdir = tmp.in(tmproot);
    process.chdir(tmpdir);
    project = { root: tmpdir };
  });

  afterEach(() => {
    process.chdir(root);
    return remove(tmproot);
  });

  function generateConfigFile(contents, _filename) {
    let filename = _filename || 'ember-try.js';
    fs.mkdirsSync('config');

    fs.writeFileSync(`config/${filename}`, contents, { encoding: 'utf8' });
  }

  it('uses specified options.configFile if present', () => {
    generateConfigFile('module.exports = { scenarios: [ { qux: "baz" }] };', 'non-default.js');

    return getConfig({ project, configPath: 'config/non-default.js' }).then((config) => {
      expect(config.scenarios).to.have.lengthOf(1);
      expect(config.scenarios[0].qux).to.equal('baz');
    });
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

  it('config file exporting a function is passed the project', () => {
    generateConfigFile('module.exports =  function(project) { return { scenarios: [ { foo: project.blah }] } };');

    project.blah = 'passed-in';
    return getConfig({ project }).then((config) => {
      expect(config.scenarios).to.have.lengthOf(1);
      expect(config.scenarios[0].foo).to.equal('passed-in');
    });
  });

  it('uses default config if project.root/config/ember-try.js is not present and no versionCompatibility', () => {
    return getConfig({ project }).then((config) => {
      expect(config).to.eql(defaultConfig());
    });
  });

  it('uses specified options.configFile over project config/ember-try.js', () => {
    generateConfigFile('module.exports = { scenarios: [ { qux: "baz" }] };', 'non-default.js');
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
        expect(config).to.eql(
          {
            scenarios: [
              { name: 'default', bower: { dependencies: {} } },
              { name: 'ember-beta', allowedToFail: true, bower: { dependencies: { ember: 'components/ember#beta' }, resolutions: { ember: 'beta' } } },
              { name: 'ember-canary', allowedToFail: true, bower: { dependencies: { ember: 'components/ember#canary' }, resolutions: { ember: 'canary' } } },
              { name: 'ember-2.2.0', bower: { dependencies: { ember: '2.2.0' } } },
            ],
          }
        );
      });
    });

    it('is always used if passed in and behaves as if config file has "useVersionCompatibility: true"', () => {
      generateConfigFile('module.exports = { scenarios: [ { foo: "bar" }] };');
      return getConfig({ project, versionCompatibility: { ember: '1.13.0' } }).then((config) => {
        expect(config).to.eql(
          {
            scenarios: [
              { name: 'default', bower: { dependencies: {} } },
              { name: 'ember-beta', allowedToFail: true, bower: { dependencies: { ember: 'components/ember#beta' }, resolutions: { ember: 'beta' } } },
              { name: 'ember-canary', allowedToFail: true, bower: { dependencies: { ember: 'components/ember#canary' }, resolutions: { ember: 'canary' } } },
              { name: 'ember-1.13.0', bower: { dependencies: { ember: '1.13.0' } } },
              { foo: 'bar' },
            ],
          }
        );
      });
    });

    it('can be overridden by passed in versionCompatibility', () => {
      return getConfig({ project, versionCompatibility: { ember: '1.13.0' } }).then((config) => {
        expect(config).to.eql(
          {
            scenarios: [
              { name: 'default', bower: { dependencies: {} } },
              { name: 'ember-beta', allowedToFail: true, bower: { dependencies: { ember: 'components/ember#beta' }, resolutions: { ember: 'beta' } } },
              { name: 'ember-canary', allowedToFail: true, bower: { dependencies: { ember: 'components/ember#canary' }, resolutions: { ember: 'canary' } } },
              { name: 'ember-1.13.0', bower: { dependencies: { ember: '1.13.0' } } },
            ],
          }
        );
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
      generateConfigFile('module.exports = { bowerOptions: ["--allow-root=true"] };');
      return getConfig({ project }).then((config) => {
        expect(config).to.eql(
          {
            bowerOptions: ['--allow-root=true'],
            scenarios: [
              { name: 'default', bower: { dependencies: {} } },
              { name: 'ember-beta', allowedToFail: true, bower: { dependencies: { ember: 'components/ember#beta' }, resolutions: { ember: 'beta' } } },
              { name: 'ember-canary', allowedToFail: true, bower: { dependencies: { ember: 'components/ember#canary' }, resolutions: { ember: 'canary' } } },
              { name: 'ember-2.2.0', bower: { dependencies: { ember: '2.2.0' } } },
            ],
          }
        );
      });
    });

    it('is merged with config if config has useVersionCompatibility', () => {
      generateConfigFile('module.exports = { useVersionCompatibility: true, bowerOptions: ["--allow-root=true"], scenarios: [ { name: "bar" }, { name: "ember-beta", allowedToFail: false } ] };');
      return getConfig({ project }).then((config) => {
        expect(config.useVersionCompatibility).to.equal(true);
        expect(config.bowerOptions).to.eql(['--allow-root=true']);
        expect(config.scenarios).to.eql([
          { name: 'default', bower: { dependencies: {} } },
          { name: 'ember-beta', allowedToFail: false, bower: { dependencies: { ember: 'components/ember#beta' }, resolutions: { ember: 'beta' } } },
          { name: 'ember-canary', allowedToFail: true, bower: { dependencies: { ember: 'components/ember#canary' }, resolutions: { ember: 'canary' } } },
          { name: 'ember-2.2.0', bower: { dependencies: { ember: '2.2.0' } } },
          { name: 'bar' },
        ]);
      });
    });
  });
});

function writePackageJSONWithVersionCompatibility() {
  fixturePackage['ember-addon'] = { versionCompatibility: { ember: '=2.2.0' } };
  writeJSONFile('package.json', fixturePackage);
}
