'use strict';

var expect         = require('chai').expect;
var TryEachCommand = require('../../lib/commands/try-each');

var origTryEachTask = TryEachCommand._TryEachTask;
var origGetConfig   = TryEachCommand._getConfig;

describe('commands/testall', function() {
  describe('#run', function() {
    var mockConfig;

    function MockTryEachTask() { }
    MockTryEachTask.prototype.run = function() { };

    beforeEach(function() {
      TryEachCommand._getConfig = function() {
        return mockConfig || { scenarios: [ ] };
      };

      TryEachCommand._TryEachTask = MockTryEachTask;
    });

    afterEach(function() {
      TryEachCommand._TryEachTask = origTryEachTask;
      TryEachCommand._getConfig = origGetConfig;
      mockConfig = null;
    });

    it('passes the configPath to _getConfig', function() {
      var configPath;
      TryEachCommand._getConfig = function(options) {
        configPath = options.configPath;

        return { scenarios: [ { name: 'foo' }]};
      };

      TryEachCommand.run({ configPath: 'foo/bar/widget.js' }, ['foo']);
      expect(configPath).to.equal('foo/bar/widget.js');
    });
  });
});
