'use strict';

var expect         = require('chai').expect;
var RSVP           = require('rsvp');
var TryEmberCommand = require('../../lib/commands/try-ember');

var origTryEachTask = TryEmberCommand._TryEachTask;
var origGetConfig   = TryEmberCommand._getConfig;

describe('commands/try-ember', function() {
  describe('#run', function() {
    var mockConfig;

    function MockTryEachTask() { }
    MockTryEachTask.prototype.run = function() { };

    beforeEach(function() {
      TryEmberCommand._getConfig = function() {
        return RSVP.resolve(mockConfig || { scenarios: [ ] });
      };

      TryEmberCommand._TryEachTask = MockTryEachTask;
    });

    afterEach(function() {
      TryEmberCommand._TryEachTask = origTryEachTask;
      TryEmberCommand._getConfig = origGetConfig;
      mockConfig = null;
    });

    it('passes the configPath to _getConfig', function() {
      var configPath;
      TryEmberCommand._getConfig = function(options) {
        configPath = options.configPath;

        return RSVP.resolve({ scenarios: [ { name: 'foo' }]});
      };

      TryEmberCommand.run({ configPath: 'foo/bar/widget.js' }, ['foo']);
      expect(configPath).to.equal('foo/bar/widget.js');
    });

    it('passes ember semver statement to _getConfig', function() {
      var versionCompatibility;
      TryEmberCommand._getConfig = function(options) {
        versionCompatibility = options.versionCompatibility;

        return RSVP.resolve({ scenarios: [ { name: 'foo' }]});
      };

      TryEmberCommand.run({}, ['1.13.0']);
      expect(versionCompatibility).to.eql({ ember: '1.13.0'});
    });
  });
});
