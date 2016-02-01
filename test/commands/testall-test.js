var should         = require('should');
var TestallCommand = require('../../lib/commands/testall');

var origTryEachTask = TestallCommand._TryEachTask;
var origGetConfig = TestallCommand._getConfig;

describe('commands/testall', function() {
  describe('#run', function() {
    var mockConfig;

    function MockTryEachTask() { }
    MockTryEachTask.prototype.run = function() { };

    beforeEach(function() {
      TestallCommand._getConfig = function() {
        return mockConfig || { scenarios: [ ] };
      };

      TestallCommand._TryEachTask = MockTryEachTask;
    });

    afterEach(function() {
      TestallCommand._TryEachTask = origTryEachTask;
      TestallCommand._getConfig = origGetConfig;
      mockConfig = null;
    });

    it('should pass the configPath to _getConfig', function() {
      var configPath;
      TestallCommand._getConfig = function(options) {
        configPath = options.configPath;

        return { scenarios: [ { name: 'foo' }]};
      };

      TestallCommand.run({ configPath: 'foo/bar/widget.js' }, ['foo']);
      configPath.should.equal('foo/bar/widget.js');
    });
  });
});
