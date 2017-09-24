'use strict';

let expect = require('chai').expect;
let RSVP = require('rsvp');
let TryEmberCommand = require('../../lib/commands/try-ember');

let origTryEachTask = TryEmberCommand._TryEachTask;
let origGetConfig = TryEmberCommand._getConfig;

describe('commands/try-ember', () => {
  describe('#run', () => {
    let mockConfig;

    function MockTryEachTask() { }
    MockTryEachTask.prototype.run = function() { };

    beforeEach(() => {
      TryEmberCommand._getConfig = function() {
        return RSVP.resolve(mockConfig || { scenarios: [] });
      };

      TryEmberCommand._TryEachTask = MockTryEachTask;
    });

    afterEach(() => {
      TryEmberCommand._TryEachTask = origTryEachTask;
      TryEmberCommand._getConfig = origGetConfig;
      mockConfig = null;
    });

    it('passes the configPath to _getConfig', () => {
      let configPath;
      TryEmberCommand._getConfig = function(options) {
        configPath = options.configPath;

        return RSVP.resolve({ scenarios: [{ name: 'foo' }] });
      };

      TryEmberCommand.run({ configPath: 'foo/bar/widget.js' }, ['foo']);
      expect(configPath).to.equal('foo/bar/widget.js');
    });

    it('passes ember semver statement to _getConfig', () => {
      let versionCompatibility;
      TryEmberCommand._getConfig = function(options) {
        versionCompatibility = options.versionCompatibility;

        return RSVP.resolve({ scenarios: [{ name: 'foo' }] });
      };

      TryEmberCommand.run({}, ['1.13.0']);
      expect(versionCompatibility).to.eql({ ember: '1.13.0' });
    });
  });
});
