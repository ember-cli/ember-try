var should        = require('should');
var TryCommand    = require('../../lib/commands/try');

var origTryEachTask = TryCommand._TryEachTask;
var origGetConfig = TryCommand._getConfig;

describe('commands/try', function() {
  describe('getCommand', function() {
    it('removes `--skip-cleanup` from resulting arguments', function() {
      var args = TryCommand.getCommand(['ember', 'try', 'foo-bar-scenario', 'build', '--skip-cleanup']);

      args.should.eql(['ember', 'build']);
    });

    it('removes `--config-path` from resulting arguments', function() {
      var args = TryCommand.getCommand(['ember', 'try', 'foo-bar-scenario', 'build', '--config-path']);

      args.should.eql(['ember', 'build']);
    });

    it('removes both `--config-path` and `--skip-cleanup` from resulting arguments', function() {
      var args = TryCommand.getCommand([
        'ember', 'try', 'foo-bar-scenario', 'build', '--config-path', '--skip-cleanup'
      ]);

      args.should.eql(['ember', 'build']);
    });

    it('adds `test` if no other subcommand arguments were supplied', function() {
      var args = TryCommand.getCommand(['ember', 'try', 'foo-bar-scenario']);

      args.should.eql([]);
    });
  });

  describe('#run', function() {
    var mockConfig;

    function MockTryEachTask() { }
    MockTryEachTask.prototype.run = function() { };

    beforeEach(function() {
      TryCommand._getConfig = function() {
        return mockConfig || { scenarios: [ ] };
      };

      TryCommand._TryEachTask = MockTryEachTask;
    });

    afterEach(function() {
      TryCommand._TryEachTask = origTryEachTask;
      TryCommand._getConfig = origGetConfig;
      mockConfig = null;
    });

    it('should throw if no scenario is provided', function() {
      (function() {
        TryCommand.run({}, []);
      }).should.throw(/requires a scenario name to be specified/);
    });

    it('should pass the configPath to _getConfig', function() {
      var configPath;
      TryCommand._getConfig = function(options) {
        configPath = options.configPath;

        return { scenarios: [ { name: 'foo' }]};
      };

      TryCommand.run({ configPath: 'foo/bar/widget.js' }, ['foo']);
      configPath.should.equal('foo/bar/widget.js');
    });

    it('should throw if a scenario was not found for the scenarioName provided', function() {
      (function() {
        TryCommand.run({ }, ['foo']);
      }).should.throw(/requires a scenario specified in the config file/);
    });

    it('should set command on task init', function() {
      testCommandSetsTheseAsCommandArgs('try default', []);
      testCommandSetsTheseAsCommandArgs('try default help', ['ember', 'help']);
      testCommandSetsTheseAsCommandArgs('try default help --json', ['ember', 'help', '--json']);
      testCommandSetsTheseAsCommandArgs('try default help --json=true', ['ember', 'help', '--json=true']);
      testCommandSetsTheseAsCommandArgs('try default help --json true', ['ember', 'help', '--json', 'true']);
    });
  });
});

function testCommandSetsTheseAsCommandArgs(command, expectedArgs) {
  var additionalArgs = command.split(' ');
  function MockTask(opts) {
    opts.commandArgs.should.eql(expectedArgs);
  }
  MockTask.prototype.run = function() {
  };
  TryCommand._TryEachTask = MockTask;
  TryCommand._commandLineArguments = function() {
    return [].concat([ '/usr/local/Cellar/node/5.3.0/bin/node',
                       '/usr/local/bin/ember'],
                     additionalArgs);
  };

  TryCommand._getConfig = function(options) {
    return { scenarios: [ { name: 'default' }]};
  };

  TryCommand.run({}, ['default']);
}
