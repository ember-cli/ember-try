'use strict';

let expect = require('chai').expect;
let DependencyManagerAdapterFactory = require('../../lib/utils/dependency-manager-adapter-factory');

describe('DependencyManagerAdapterFactory', () => {
  describe('generateFromConfig', () => {
    it('creates npm adapter when config has npm key', () => {
      let adapters = DependencyManagerAdapterFactory.generateFromConfig({ scenarios: [{ npm: {} }] }, 'here');
      expect(adapters[0].configKey).to.equal('npm');
      expect(adapters.length).to.equal(1);
    });

    it('creates bower adapter when config has bower key', () => {
      let adapters = DependencyManagerAdapterFactory.generateFromConfig({ scenarios: [{ bower: {} }] }, 'here');
      expect(adapters[0].configKey).to.equal('bower');
      expect(adapters.length).to.equal(1);
    });

    it('creates both adapters when it has both keys', () => {
      let adapters = DependencyManagerAdapterFactory.generateFromConfig({ scenarios: [{ bower: {}, npm: {} }] }, 'here');
      expect(adapters[0].configKey).to.equal('npm');
      expect(adapters[1].configKey).to.equal('bower');
      expect(adapters.length).to.equal(2);
    });

    it('creates bower adapter when legacy dependenies key', () => {
      let adapters = DependencyManagerAdapterFactory.generateFromConfig({ scenarios: [{ dependencies: {} }] }, 'here');
      expect(adapters[0].configKey).to.equal('bower');
      expect(adapters.length).to.equal(1);
    });

    it('creates bower adapter when legacy devDependencies key', () => {
      let adapters = DependencyManagerAdapterFactory.generateFromConfig({ scenarios: [{ devDependencies: {} }] }, 'here');
      expect(adapters[0].configKey).to.equal('bower');
      expect(adapters.length).to.equal(1);
    });
  });
});
