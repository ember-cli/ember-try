'use strict';

var expect = require('chai').expect;
var DependencyManagerAdapterFactory = require('../../lib/utils/dependency-manager-adapter-factory');

describe('DependencyManagerAdapterFactory', function() {
  describe('generateFromConfig', function() {
    it('creates both adapters, in order, when there is only an npm key', function() {
      var adapters = DependencyManagerAdapterFactory.generateFromConfig({ scenarios: [{ npm: {} }] }, 'here');
      expect(adapters[0].configKey).to.equal('npm');
      expect(adapters[1].configKey).to.equal('bower');
      expect(adapters.length).to.equal(2);
    });

    it('creates both adapters, in order, when there is only a bower key', function() {
      var adapters = DependencyManagerAdapterFactory.generateFromConfig({ scenarios: [{ bower: {} }] }, 'here');
      expect(adapters[0].configKey).to.equal('npm');
      expect(adapters[1].configKey).to.equal('bower');
      expect(adapters.length).to.equal(2);
    });

    it('creates both adapters, in order, when both keys are present', function() {
      var adapters = DependencyManagerAdapterFactory.generateFromConfig({ scenarios: [{ bower: {}, npm: {} }] }, 'here');
      expect(adapters[0].configKey).to.equal('npm');
      expect(adapters[1].configKey).to.equal('bower');
      expect(adapters.length).to.equal(2);
    });

    it('creates both adapters, in order, when there is only a legacy top-level dependencies', function() {
      var adapters = DependencyManagerAdapterFactory.generateFromConfig({ scenarios: [{ dependencies: {} }] }, 'here');
      expect(adapters[0].configKey).to.equal('npm');
      expect(adapters[1].configKey).to.equal('bower');
      expect(adapters.length).to.equal(2);
    });

    it('creates both adapters, in order, when there is only a legacy top-level devDependencies', function() {
      var adapters = DependencyManagerAdapterFactory.generateFromConfig({ scenarios: [{ devDependencies: {} }] }, 'here');
      expect(adapters[0].configKey).to.equal('npm');
      expect(adapters[1].configKey).to.equal('bower');
      expect(adapters.length).to.equal(2);
    });
  });
});
