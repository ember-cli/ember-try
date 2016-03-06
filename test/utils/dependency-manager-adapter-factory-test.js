'use strict';

var expect                          = require('chai').expect;
var DependencyManagerAdapterFactory = require('../../lib/utils/dependency-manager-adapter-factory');

describe('DependencyManagerAdapterFactory', function() {
  describe('generateFromConfig', function() {
    it('creates npm adapter when config has npm key', function() {
      var adapters = DependencyManagerAdapterFactory.generateFromConfig({ scenarios: [{ npm: {} }]}, 'here');
      expect(adapters[0].configKey).to.equal('npm');
      expect(adapters.length).to.equal(1);
    });

    it('creates bower adapter when config has bower key', function() {
      var adapters = DependencyManagerAdapterFactory.generateFromConfig({ scenarios: [{ bower: {} }]}, 'here');
      expect(adapters[0].configKey).to.equal('bower');
      expect(adapters.length).to.equal(1);
    });

    it('creates both adapters when it has both keys', function() {
      var adapters = DependencyManagerAdapterFactory.generateFromConfig({ scenarios: [{ bower: {}, npm: {}}]}, 'here');
      expect(adapters[0].configKey).to.equal('npm');
      expect(adapters[1].configKey).to.equal('bower');
      expect(adapters.length).to.equal(2);
    });

    it('creates bower adapter when legacy dependenies key', function() {
      var adapters = DependencyManagerAdapterFactory.generateFromConfig({ scenarios: [{ dependencies: {}}]}, 'here');
      expect(adapters[0].configKey).to.equal('bower');
      expect(adapters.length).to.equal(1);
    });

    it('creates bower adapter when legacy devDependencies key', function() {
      var adapters = DependencyManagerAdapterFactory.generateFromConfig({ scenarios: [{ devDependencies: {}}]}, 'here');
      expect(adapters[0].configKey).to.equal('bower');
      expect(adapters.length).to.equal(1);
    });
  });
});
