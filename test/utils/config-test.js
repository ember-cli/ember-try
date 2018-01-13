'use strict';

var expect = require('chai').expect;
var RSVP = require('rsvp');
var fs = require('fs-extra');
var path = require('path');
var tmp = require('tmp-sync');
var fixturePackage = require('../fixtures/package.json');
var writeJSONFile = require('../helpers/write-json-file');
var getConfig = require('../../lib/utils/config');
var defaultConfig = getConfig._defaultConfig;
var addImplicitBowerToScenarios = getConfig._addImplicitBowerToScenarios;

var remove = RSVP.denodeify(fs.remove);
var root = process.cwd();
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

  describe('addImplicitBowerToScenarios', function() {
    it('adds an npm with a bower dev depencency for scenarios that have only bower', function() {
      expect(addImplicitBowerToScenarios({
        scenarios: [{
          name: 'bower-only',
          bower: { dependencies: {} },
        }]
      })).to.deep.equal({
        scenarios: [{
          name: 'bower-only',
          bower: { dependencies: {} },
          npm: { devDependencies: { bower: '^1.8.2' } },
        }]
      });
    });

    it('adds a bower dev dependency for scnearios that have bower and npm', function() {
      expect(addImplicitBowerToScenarios({
        scenarios: [{
          name: 'bower-and-npm',
          bower: { dependencies: {} },
          npm: { devDependencies: { foo: 'latest' } },
        }]
      })).to.deep.equal({
        scenarios: [{
          name: 'bower-and-npm',
          bower: { dependencies: {} },
          npm: { devDependencies: { foo: 'latest', bower: '^1.8.2' } },
        }]
      });
    });

    it('does not add a bower dev dependency if a bower dev dependency is already present', function() {
      expect(addImplicitBowerToScenarios({
        scenarios: [{
          name: 'bower-dev-dependency',
          bower: { dependencies: {} },
          npm: { devDependencies: { bower: '^1.8.2' } },
        }]
      })).to.deep.equal({
        scenarios: [{
          name: 'bower-dev-dependency',
          bower: { dependencies: {} },
          npm: { devDependencies: { bower: '^1.8.2' } },
        }]
      });
    });

    it('does not add a bower dev dependency if a bower dependency is already present', function() {
      expect(addImplicitBowerToScenarios({
        scenarios: [{
          name: 'bower-dependency',
          bower: { dependencies: {} },
          npm: { dependencies: { bower: '^1.8.2' } },
        }]
      })).to.deep.equal({
        scenarios: [{
          name: 'bower-dependency',
          bower: { dependencies: {} },
          npm: { dependencies: { bower: '^1.8.2' } },
        }]
      });
    });

    it('does not add a bower dev dependency if bower is not present', function() {
      expect(addImplicitBowerToScenarios({
        scenarios: [{
          name: 'no-bower',
          npm: { devDependencies: { foo: 'latest' } },
        }]
      })).to.deep.equal({
        scenarios: [{
          name: 'no-bower',
          npm: { devDependencies: { foo: 'latest' } },
        }]
      });
    });
  });

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

  it('implicitly adds a bower dev dependency for npm for scenarios that include bower', function() {
    generateConfigFile('module.exports = { scenarios: [ { bower: { dependencies: { foo: "latest" } } }] };');

    return getConfig({ project: project }).then(function(config) {
      expect(config.scenarios).to.have.lengthOf(1);
      expect(config.scenarios[0]).to.deep.equal({
        bower: { dependencies: { foo: 'latest' } },
        npm: { devDependencies: { bower: '^1.8.2' } },
      });
    });
  });

  it('does not add a bower dependency for scenarios that do not include bower', function() {
    generateConfigFile('module.exports = { scenarios: [ { npm: { dependencies: { foo: "latest" } } }] };');

    return getConfig({ project: project }).then(function(config) {
      expect(config.scenarios).to.have.lengthOf(1);
      expect(config.scenarios[0]).to.deep.equal({
        npm: { dependencies: { foo: 'latest' } },
      });
    });
  });

  it('config file can export a function', function() {
    generateConfigFile('module.exports =  function() { return { scenarios: [ { foo: "bar" }] } };');

    return getConfig({ project: project }).then(function(config) {
      expect(config.scenarios).to.have.lengthOf(1);
      expect(config.scenarios[0].foo).to.equal('bar');
    });
  });

  it('config file can return a promise', function() {
    var configFile = 'module.exports = function() {' +
                     '  return new Promise(function (resolve) {' +
                     '    var scenarios = [' +
                     '      { bar: "baz" }' +
                     '    ];' +
                     '    resolve({ scenarios: scenarios });' +
                     '  });' +
                     '};';
    generateConfigFile(configFile);
    return getConfig({ project: project }).then(function(config) {
      expect(config.scenarios).to.have.lengthOf(1);
      expect(config.scenarios[0].bar).to.equal('baz');
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
        expect(config).to.eql({
          scenarios: [
            { name: 'default', bower: { dependencies: {} }, npm: { devDependencies: { bower: '^1.8.2' } } },
            {
              name: 'ember-beta',
              allowedToFail: true,
              bower: { dependencies: { ember: 'components/ember#beta' }, resolutions: { ember: 'beta' } },
              npm: { devDependencies: { 'ember-source': null, bower: '^1.8.2' } },
            },
            {
              name: 'ember-canary',
              allowedToFail: true,
              bower: { dependencies: { ember: 'components/ember#canary' }, resolutions: { ember: 'canary' } },
              npm: { devDependencies: { 'ember-source': null, bower: '^1.8.2' } },
            },
            {
              name: 'ember-2.2.0',
              bower: { dependencies: { ember: '2.2.0' } },
              npm: { devDependencies: { 'ember-source': null, bower: '^1.8.2' } },
            },
          ],
        });
      });
    });

    it('is always used if passed in and behaves as if config file has "useVersionCompatibility: true"', function() {
      generateConfigFile('module.exports = { scenarios: [ { foo: "bar" }] };');
      return getConfig({ project: project, versionCompatibility: { ember: '1.13.0' } }).then(function(config) {
        expect(config).to.eql({
          scenarios: [
            { name: 'default', bower: { dependencies: {} }, npm: { devDependencies: { bower: '^1.8.2' } } },
            {
              name: 'ember-beta',
              allowedToFail: true,
              bower: { dependencies: { ember: 'components/ember#beta' }, resolutions: { ember: 'beta' } },
              npm: { devDependencies: { 'ember-source': null, bower: '^1.8.2' } },
            },
            {
              name: 'ember-canary',
              allowedToFail: true,
              bower: { dependencies: { ember: 'components/ember#canary' }, resolutions: { ember: 'canary' } },
              npm: { devDependencies: { 'ember-source': null, bower: '^1.8.2' } },
            },
            {
              name: 'ember-1.13.0',
              bower: { dependencies: { ember: '1.13.0' } },
              npm: { devDependencies: { 'ember-source': null, bower: '^1.8.2' } },
            },
            { foo: 'bar' },
          ],
        });
      });
    });

    it('can be overridden by passed in versionCompatibility', function() {
      return getConfig({ project: project, versionCompatibility: { ember: '1.13.0' } }).then(function(config) {
        expect(config).to.eql({
          scenarios: [
            { name: 'default', bower: { dependencies: {} }, npm: { devDependencies: { bower: '^1.8.2' } } },
            {
              name: 'ember-beta',
              allowedToFail: true,
              bower: { dependencies: { ember: 'components/ember#beta' }, resolutions: { ember: 'beta' } },
              npm: { devDependencies: { 'ember-source': null, bower: '^1.8.2' } },
            },
            {
              name: 'ember-canary',
              allowedToFail: true,
              bower: { dependencies: { ember: 'components/ember#canary' }, resolutions: { ember: 'canary' } },
              npm: { devDependencies: { 'ember-source': null, bower: '^1.8.2' } },
            },
            {
              name: 'ember-1.13.0',
              bower: { dependencies: { ember: '1.13.0' } },
              npm: { devDependencies: { 'ember-source': null, bower: '^1.8.2' } },
            },
          ],
        });
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
        expect(config).to.eql({
          bowerOptions: ['--allow-root=true'],
          scenarios: [
            {
              name: 'default',
              bower: { dependencies: {} },
              npm: { devDependencies: { bower: '^1.8.2' } },
            },
            {
              name: 'ember-beta',
              allowedToFail: true,
              bower: { dependencies: { ember: 'components/ember#beta' }, resolutions: { ember: 'beta' } },
              npm: { devDependencies: { 'ember-source': null, bower: '^1.8.2' } },
            },
            {
              name: 'ember-canary',
              allowedToFail: true,
              bower: { dependencies: { ember: 'components/ember#canary' }, resolutions: { ember: 'canary' } },
              npm: { devDependencies: { 'ember-source': null, bower: '^1.8.2' } },
            },
            {
              name: 'ember-2.2.0',
              bower: { dependencies: { ember: '2.2.0' } },
              npm: { devDependencies: { 'ember-source': null, bower: '^1.8.2' } },
            },
          ],
        });
      });
    });

    it('is merged with config if config has useVersionCompatibility', function() {
      generateConfigFile(
        'module.exports = { useVersionCompatibility: true, bowerOptions: ["--allow-root=true"], scenarios: [ { name: "bar" }, { name: "ember-beta", allowedToFail: false } ] };'
      );
      return getConfig({ project: project }).then(function(config) {
        expect(config.useVersionCompatibility).to.equal(true);
        expect(config.bowerOptions).to.eql(['--allow-root=true']);
        expect(config.scenarios).to.eql([
          {
            name: 'default',
            bower: { dependencies: {} },
            npm: { devDependencies: { bower: '^1.8.2' } },
          },
          {
            name: 'ember-beta',
            allowedToFail: false,
            bower: { dependencies: { ember: 'components/ember#beta' }, resolutions: { ember: 'beta' } },
            npm: { devDependencies: { 'ember-source': null, bower: '^1.8.2' } },
          },
          {
            name: 'ember-canary',
            allowedToFail: true,
            bower: { dependencies: { ember: 'components/ember#canary' }, resolutions: { ember: 'canary' } },
            npm: { devDependencies: { 'ember-source': null, bower: '^1.8.2' } },
          },
          {
            name: 'ember-2.2.0',
            bower: { dependencies: { ember: '2.2.0' } },
            npm: { devDependencies: { 'ember-source': null, bower: '^1.8.2' } },
          },
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
