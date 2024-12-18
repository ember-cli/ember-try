import { expect } from 'chai';
import TryEmberCommand from '../../lib/commands/try-ember.js';

const origTryEachTask = TryEmberCommand._TryEachTask;
const origGetConfig = TryEmberCommand._getConfig;

describe('commands/try-ember', () => {
  describe('#run', () => {
    let mockConfig;

    function MockTryEachTask() {}
    MockTryEachTask.prototype.run = function () {};

    beforeEach(() => {
      TryEmberCommand.project = { root: '' };

      TryEmberCommand._getConfig = function () {
        return Promise.resolve(mockConfig || { scenarios: [] });
      };

      TryEmberCommand._TryEachTask = MockTryEachTask;
    });

    afterEach(() => {
      delete TryEmberCommand.project;

      TryEmberCommand._TryEachTask = origTryEachTask;
      TryEmberCommand._getConfig = origGetConfig;
      mockConfig = null;
    });

    it('passes the configPath to _getConfig', () => {
      let configPath;
      TryEmberCommand._getConfig = function (options) {
        configPath = options.configPath;

        return Promise.resolve({ scenarios: [{ name: 'foo' }] });
      };

      TryEmberCommand.run({ configPath: 'foo/bar/widget.js' }, ['foo']);
      expect(configPath).to.equal('foo/bar/widget.js');
    });

    it('passes ember semver statement to _getConfig', () => {
      let versionCompatibility;
      TryEmberCommand._getConfig = function (options) {
        versionCompatibility = options.versionCompatibility;

        return Promise.resolve({ scenarios: [{ name: 'foo' }] });
      };

      TryEmberCommand.run({}, ['1.13.0']);
      expect(versionCompatibility).to.eql({ ember: '1.13.0' });
    });
  });
});
