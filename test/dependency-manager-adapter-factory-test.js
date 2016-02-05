var DependencyManagerAdapterFactory = require('../lib/utils/dependency-manager-adapter-factory');
var should = require('should');

describe('DependencyManagerAdapterFactory', function() {
  describe('generateFromConfig', function() {
    it('creates npm adapter when config has npm key', function() {
      var adapters = DependencyManagerAdapterFactory.generateFromConfig({ scenarios: [{ npm: {} }]}, 'here');
      adapters[0].configKey.should.equal('npm');
      adapters.length.should.equal(1);
    });

    it('creates bower adapter when config has bower key', function() {
      var adapters = DependencyManagerAdapterFactory.generateFromConfig({ scenarios: [{ bower: {} }]}, 'here');
      adapters[0].configKey.should.equal('bower');
      adapters.length.should.equal(1);
    });

    it('creates both adapters when it has both keys', function() {
      var adapters = DependencyManagerAdapterFactory.generateFromConfig({ scenarios: [{ bower: {}, npm: {}}]}, 'here');
      adapters[0].configKey.should.equal('npm');
      adapters[1].configKey.should.equal('bower');
      adapters.length.should.equal(2);
    });

    it('creates bower adapter when legacy dependenies key', function() {
      var adapters = DependencyManagerAdapterFactory.generateFromConfig({ scenarios: [{ dependencies: {}}]}, 'here');
      adapters[0].configKey.should.equal('bower');
      adapters.length.should.equal(1);
    });

    it('creates bower adapter when legacy devDependencies key', function() {
      var adapters = DependencyManagerAdapterFactory.generateFromConfig({ scenarios: [{ devDependencies: {}}]}, 'here');
      adapters[0].configKey.should.equal('bower');
      adapters.length.should.equal(1);
    });
  });
});
