'use strict';

let expect = require('chai').expect;
let RSVP = require('rsvp');
let TryOneCommand = require('../../lib/commands/try-one');

let origTryEachTask = TryOneCommand._TryEachTask;
let origGetConfig = TryOneCommand._getConfig;

describe('commands/try-one', () => {
  describe('getCommand', () => {
    it('returns args after --- as command args', () => {
      let args = TryOneCommand.getCommand(['ember', 'try:one', 'foo-bar-scenario', '--skip-cleanup', '---', 'ember', 'build']);
      expect(args).to.eql(['ember', 'build']);
    });

    it('returns no command args if no ---', () => {
      let args = TryOneCommand.getCommand(['ember', 'try:one', 'foo-bar-scenario', '--skip-cleanup']);
      expect(args).to.eql([]);
    });
  });

  describe('#run', () => {
    let mockConfig;

    function MockTryEachTask() { }
    MockTryEachTask.prototype.run = function() { };

    beforeEach(() => {
      TryOneCommand._getConfig = function() {
        return RSVP.resolve(mockConfig || { scenarios: [] });
      };

      TryOneCommand._TryEachTask = MockTryEachTask;
    });

    afterEach(() => {
      TryOneCommand._TryEachTask = origTryEachTask;
      TryOneCommand._getConfig = origGetConfig;
      mockConfig = null;
    });

    it('throws if no scenario is provided', () => {
      expect(() => {
        TryOneCommand.run({}, []);
      }).to.throw(/requires a scenario name to be specified/);
    });

    it('passes the configPath to _getConfig', () => {
      let configPath;
      TryOneCommand._getConfig = function(options) {
        configPath = options.configPath;

        return RSVP.resolve({ scenarios: [{ name: 'foo' }] });
      };

      TryOneCommand.run({ configPath: 'foo/bar/widget.js' }, ['foo']);
      expect(configPath).to.equal('foo/bar/widget.js');
    });

    it('throws if a scenario was not found for the scenarioName provided', () => {
      return TryOneCommand.run({ }, ['foo']).catch((error) => {
        expect(error).to.match(/requires a scenario specified in the config/);
      });
    });

    it('sets command on task init', () => {
      testCommandSetsTheseAsCommandArgs('try:one default', []);
      testCommandSetsTheseAsCommandArgs('try:one default --- ember help', ['ember', 'help']);
      testCommandSetsTheseAsCommandArgs('try:one default --- ember help --json', ['ember', 'help', '--json']);
      testCommandSetsTheseAsCommandArgs('try:one default --- ember help --json=true', ['ember', 'help', '--json=true']);
      testCommandSetsTheseAsCommandArgs('try:one default --- ember help --json true', ['ember', 'help', '--json', 'true']);
    });
  });
});

function testCommandSetsTheseAsCommandArgs(command, expectedArgs) {
  let additionalArgs = command.split(' ');
  function MockTask(opts) {
    expect(opts.commandArgs).to.eql(expectedArgs);
  }
  MockTask.prototype.run = function() {
  };
  TryOneCommand._TryEachTask = MockTask;
  TryOneCommand._commandLineArguments = function() {
    return [].concat(['/usr/local/Cellar/node/5.3.0/bin/node',
      '/usr/local/bin/ember'],
    additionalArgs);
  };

  TryOneCommand._getConfig = function() {
    return RSVP.resolve({ scenarios: [{ name: 'default' }] });
  };

  TryOneCommand.run({}, ['default']);
}
