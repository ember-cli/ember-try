import { expect } from 'chai';
import TryEachCommand from '../../lib/commands/try-each.js';

const origTryEachTask = TryEachCommand._TryEachTask;
const origGetConfig = TryEachCommand._getConfig;

describe('commands/try-each', () => {
  describe('#run', () => {
    let mockConfig;

    function MockTryEachTask() {}
    MockTryEachTask.prototype.run = function () {};

    beforeEach(() => {
      TryEachCommand.project = { root: '' };

      TryEachCommand._getConfig = function () {
        return Promise.resolve(mockConfig || { scenarios: [] });
      };

      TryEachCommand._TryEachTask = MockTryEachTask;
    });

    afterEach(() => {
      delete TryEachCommand.project;

      TryEachCommand._TryEachTask = origTryEachTask;
      TryEachCommand._getConfig = origGetConfig;
      mockConfig = null;
    });

    it('passes the configPath to _getConfig', () => {
      let configPath;
      TryEachCommand._getConfig = function (options) {
        configPath = options.configPath;

        return Promise.resolve({ scenarios: [{ name: 'foo' }] });
      };

      TryEachCommand.run({ configPath: 'foo/bar/widget.js' }, ['foo']);
      expect(configPath).to.equal('foo/bar/widget.js');
    });
  });
});
