'use strict';

var expect        = require('chai').expect;
var RSVP          = require('rsvp');
var fs            = require('fs-extra');
var path          = require('path');
var tmp           = require('tmp-sync');
var fixturePackage  = require('../fixtures/package.json');
var writeJSONFile   = require('../helpers/write-json-file');
var getConfig     = require('../../lib/utils/config');
var defaultConfig = getConfig._defaultConfig;

var remove  = RSVP.denodeify(fs.remove);
var root    = process.cwd();
var tmproot = path.join(root, 'tmp');
var tmpdir;

describe('utils/config', function() {
  var project;

  beforeEach(function() {
    tmpdir = tmp.in(tmproot);
    process.chdir(tmpdir);
    project = { root: tmpdir };
  });

  afterEach(function() {
    process.chdir(root);
    return remove(tmproot);
  });

  function generateConfigFile(contents, _filename) {
    var filename = _filename || 'ember-try.js';
    fs.mkdirsSync('config');

    fs.writeFileSync('config/' + filename, contents, { encoding: 'utf8' });
  }

  it('uses specified options.configFile if present', function() {
    generateConfigFile('module.exports = { scenarios: [ { qux: "baz" }] };', 'non-default.js');

    return getConfig({ project: project, configPath: 'config/non-default.js' }).then(function(config) {
      expect(config.scenarios).to.have.lengthOf(1);
      expect(config.scenarios[0].qux).to.equal('baz');
    });
  });

  it('uses projects config/ember-try.js if present', function() {
    generateConfigFile('module.exports = { scenarios: [ { foo: "bar" }] };');

    return getConfig({ project: project }).then(function(config) {
      expect(config.scenarios).to.have.lengthOf(1);
      expect(config.scenarios[0].foo).to.equal('bar');
    });
  });

  it('config file can export a function', function() {
    generateConfigFile('module.exports =  function() { return { scenarios: [ { foo: "bar" }] } };');

    return getConfig({ project: project }).then(function(config) {
      expect(config.scenarios).to.have.lengthOf(1);
      expect(config.scenarios[0].foo).to.equal('bar');
    });
  });

  it('config file exporting a function is passed the project', function() {
    generateConfigFile('module.exports =  function(project) { return { scenarios: [ { foo: project.blah }] } };');

    project.blah = 'passed-in';
    return getConfig({ project: project }).then(function(config) {
      expect(config.scenarios).to.have.lengthOf(1);
      expect(config.scenarios[0].foo).to.equal('passed-in');
    });
  });

  it('uses default config if project.root/config/ember-try.js is not present and no versionCompatibility', function() {
    return getConfig({ project: project }).then(function(config) {
      expect(config).to.eql(defaultConfig());
    });
  });

  it('uses specified options.configFile over project config/ember-try.js', function() {
    generateConfigFile('module.exports = { scenarios: [ { qux: "baz" }] };', 'non-default.js');
    generateConfigFile('module.exports = { scenarios: [ { foo: "bar" }] };'); // Should not be used

    return getConfig({ project: project, configPath: 'config/non-default.js' }).then(function(config) {
      expect(config.scenarios).to.have.lengthOf(1);
      expect(config.scenarios[0].qux).to.equal('baz');
    });
  });

  describe('versionCompatibility', function() {
    beforeEach(function() {
      writePackageJSONWithVersionCompatibility();
    });

    it('is used if there is no config file', function() {
      return getConfig({ project: project }).then(function(config) {
        expect(config).to.eql(
          {
            scenarios: [
              { name: 'default', bower: { dependencies: {} } },
              { name: 'ember-beta', allowedToFail: true, bower: { dependencies: { ember: 'components/ember#beta' }, resolutions: { ember: 'beta' } } },
              { name: 'ember-canary', allowedToFail: true, bower: { dependencies: { ember: 'components/ember#canary' }, resolutions: { ember: 'canary' } } },
              { name: 'ember-2.2.0', bower: { dependencies: { ember: '2.2.0' } } }
            ]
          }
        );
      });
    });

    it('is always used if passed in and behaves as if config file has "useVersionCompatibility: true"', function() {
      generateConfigFile('module.exports = { scenarios: [ { foo: "bar" }] };');
      return getConfig({ project: project, versionCompatibility: { ember: '1.13.0'} }).then(function(config) {
        expect(config).to.eql(
          {
            scenarios: [
              { name: 'default', bower: { dependencies: {} } },
              { name: 'ember-beta', allowedToFail: true, bower: { dependencies: { ember: 'components/ember#beta' }, resolutions: { ember: 'beta' } } },
              { name: 'ember-canary', allowedToFail: true, bower: { dependencies: { ember: 'components/ember#canary' }, resolutions: { ember: 'canary' } } },
              { name: 'ember-1.13.0', bower: { dependencies: { ember: '1.13.0' } } },
              { foo: 'bar' }
            ]
          }
        );
      });
    });

    it('can be overridden by passed in versionCompatibility', function() {
      return getConfig({ project: project, versionCompatibility: { ember: '1.13.0'} }).then(function(config) {
        expect(config).to.eql(
          {
            scenarios: [
              { name: 'default', bower: { dependencies: {} } },
              { name: 'ember-beta', allowedToFail: true, bower: { dependencies: { ember: 'components/ember#beta' }, resolutions: { ember: 'beta' } } },
              { name: 'ember-canary', allowedToFail: true, bower: { dependencies: { ember: 'components/ember#canary' }, resolutions: { ember: 'canary' } } },
              { name: 'ember-1.13.0', bower: { dependencies: { ember: '1.13.0' } } }
            ]
          }
        );
      });
    });

    it('is ignored if config file has scenarios', function() {
      generateConfigFile('module.exports = { scenarios: [ { foo: "bar" }] };');

      return getConfig({ project: project }).then(function(config) {
        expect(config.scenarios).to.have.lengthOf(1);
        expect(config.scenarios[0].foo).to.equal('bar');
      });
    });

    it('is merged with config if config does not have scenarios', function() {
      generateConfigFile('module.exports = { bowerOptions: ["--allow-root=true"] };');
      return getConfig({ project: project }).then(function(config) {
        expect(config).to.eql(
          {
            bowerOptions: ['--allow-root=true'],
            scenarios: [
              { name: 'default', bower: { dependencies: {} } },
              { name: 'ember-beta', allowedToFail: true, bower: { dependencies: { ember: 'components/ember#beta' }, resolutions: { ember: 'beta' } } },
              { name: 'ember-canary', allowedToFail: true, bower: { dependencies: { ember: 'components/ember#canary' }, resolutions: { ember: 'canary' } } },
              { name: 'ember-2.2.0', bower: { dependencies: { ember: '2.2.0' } } }
            ]
          }
        );
      });
    });

    it('is merged with config if config has useVersionCompatibility', function() {
      generateConfigFile('module.exports = { useVersionCompatibility: true, bowerOptions: ["--allow-root=true"], scenarios: [ { name: "bar" }, { name: "ember-beta", allowedToFail: false } ] };');
      return getConfig({ project: project }).then(function(config) {
        expect(config.useVersionCompatibility).to.equal(true);
        expect(config.bowerOptions).to.eql(['--allow-root=true']);
        expect(config.scenarios).to.eql([
          { name: 'default', bower: { dependencies: {} } },
          { name: 'ember-beta', allowedToFail: false, bower: { dependencies: { ember: 'components/ember#beta' }, resolutions: { ember: 'beta' } } },
          { name: 'ember-canary', allowedToFail: true, bower: { dependencies: { ember: 'components/ember#canary' }, resolutions: { ember: 'canary' } } },
          { name: 'ember-2.2.0', bower: { dependencies: { ember: '2.2.0' } } },
          { name: 'bar' }
        ]);
      });
    });
  });
});

function writePackageJSONWithVersionCompatibility() {
  fixturePackage['ember-addon'] = { versionCompatibility: { ember: '=2.2.0'}};
  writeJSONFile('package.json', fixturePackage);
}
