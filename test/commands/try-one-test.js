var should        = require('should');
var TryOneCommand    = require('../../lib/commands/try-one');

var origTryEachTask = TryOneCommand._TryEachTask;
var origGetConfig = TryOneCommand._getConfig;

describe('commands/try-one', function() {
  describe('getCommand', function() {
    it('returns args after --- as command args', function() {
      var args = TryOneCommand.getCommand(['ember', 'try:one', 'foo-bar-scenario', '--skip-cleanup', '---', 'ember', 'build']);
      args.should.eql(['ember', 'build']);
    });

    it('returns no command args if no ---', function() {
      var args = TryOneCommand.getCommand(['ember', 'try:one', 'foo-bar-scenario', '--skip-cleanup']);
      args.should.eql([]);
    });
  });

  describe('#run', function() {
    var mockConfig;

    function MockTryEachTask() { }
    MockTryEachTask.prototype.run = function() { };

    beforeEach(function() {
      TryOneCommand._getConfig = function() {
        return mockConfig || { scenarios: [ ] };
      };

      TryOneCommand._TryEachTask = MockTryEachTask;
    });

    afterEach(function() {
      TryOneCommand._TryEachTask = origTryEachTask;
      TryOneCommand._getConfig = origGetConfig;
      mockConfig = null;
    });

    it('should throw if no scenario is provided', function() {
      (function() {
        TryOneCommand.run({}, []);
      }).should.throw(/requires a scenario name to be specified/);
    });

    it('should pass the configPath to _getConfig', function() {
      var configPath;
      TryOneCommand._getConfig = function(options) {
        configPath = options.configPath;

        return { scenarios: [ { name: 'foo' }]};
      };

      TryOneCommand.run({ configPath: 'foo/bar/widget.js' }, ['foo']);
      configPath.should.equal('foo/bar/widget.js');
    });

    it('should throw if a scenario was not found for the scenarioName provided', function() {
      (function() {
        TryOneCommand.run({ }, ['foo']);
      }).should.throw(/requires a scenario specified in the config file/);
    });

    it('should set command on task init', function() {
      testCommandSetsTheseAsCommandArgs('try:one default', []);
      testCommandSetsTheseAsCommandArgs('try:one default --- ember help', ['ember', 'help']);
      testCommandSetsTheseAsCommandArgs('try:one default --- ember help --json', ['ember', 'help', '--json']);
      testCommandSetsTheseAsCommandArgs('try:one default --- ember help --json=true', ['ember', 'help', '--json=true']);
      testCommandSetsTheseAsCommandArgs('try:one default --- ember help --json true', ['ember', 'help', '--json', 'true']);
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
  TryOneCommand._TryEachTask = MockTask;
  TryOneCommand._commandLineArguments = function() {
    return [].concat([ '/usr/local/Cellar/node/5.3.0/bin/node',
                       '/usr/local/bin/ember'],
                     additionalArgs);
  };

  TryOneCommand._getConfig = function(options) {
    return { scenarios: [ { name: 'default' }]};
  };

  TryOneCommand.run({}, ['default']);
}
