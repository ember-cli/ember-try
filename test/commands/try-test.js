'use strict';

let expect = require('chai').expect;
let RSVP = require('rsvp');
let TryCommand = require('../../lib/commands/try');

let origTryEachTask = TryCommand._TryEachTask;
let origGetConfig = TryCommand._getConfig;

describe('commands/try', () => {
  describe('getCommand', () => {
    it('removes `--skip-cleanup` from resulting arguments', () => {
      let args = TryCommand.getCommand(['ember', 'try', 'foo-bar-scenario', 'build', '--skip-cleanup']);

      expect(args).to.eql(['ember', 'build']);
    });

    it('removes `--config-path` from resulting arguments', () => {
      let args = TryCommand.getCommand(['ember', 'try', 'foo-bar-scenario', 'build', '--config-path']);

      expect(args).to.eql(['ember', 'build']);
    });

    it('removes both `--config-path` and `--skip-cleanup` from resulting arguments', () => {
      let args = TryCommand.getCommand([
        'ember', 'try', 'foo-bar-scenario', 'build', '--config-path', '--skip-cleanup',
      ]);

      expect(args).to.eql(['ember', 'build']);
    });

    it('adds `test` if no other subcommand arguments were supplied', () => {
      let args = TryCommand.getCommand(['ember', 'try', 'foo-bar-scenario']);

      expect(args).to.eql([]);
    });
  });

  describe('#run', () => {
    let mockConfig;

    function MockTryEachTask() { }
    MockTryEachTask.prototype.run = function() { };

    beforeEach(() => {
      TryCommand._getConfig = function() {
        return RSVP.resolve(mockConfig || { scenarios: [] });
      };

      TryCommand.ui = { writeDeprecateLine() {} };

      TryCommand._TryEachTask = MockTryEachTask;
    });

    afterEach(() => {
      TryCommand._TryEachTask = origTryEachTask;
      TryCommand._getConfig = origGetConfig;
      mockConfig = null;
    });

    it('throws if no scenario is provided', () => {
      expect(() => {
        TryCommand.run({}, []);
      }).to.throw(/requires a scenario name to be specified/);
    });

    it('passes the configPath to _getConfig', () => {
      let configPath;
      TryCommand._getConfig = function(options) {
        configPath = options.configPath;

        return RSVP.resolve({ scenarios: [{ name: 'foo' }] });
      };

      TryCommand.run({ configPath: 'foo/bar/widget.js' }, ['foo']);
      expect(configPath).to.equal('foo/bar/widget.js');
    });

    it('throws if a scenario was not found for the scenarioName provided', () => {
      return TryCommand.run({ }, ['foo']).catch((error) => {
        expect(error).to.match(/requires a scenario specified in the config/);
      });
    });

    it('sets command on task init', () => {
      testCommandSetsTheseAsCommandArgs('try default', []);
      testCommandSetsTheseAsCommandArgs('try default help', ['ember', 'help']);
      testCommandSetsTheseAsCommandArgs('try default help --json', ['ember', 'help', '--json']);
      testCommandSetsTheseAsCommandArgs('try default help --json=true', ['ember', 'help', '--json=true']);
      testCommandSetsTheseAsCommandArgs('try default help --json true', ['ember', 'help', '--json', 'true']);
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
  TryCommand._TryEachTask = MockTask;
  TryCommand._commandLineArguments = function() {
    return [].concat(['/usr/local/Cellar/node/5.3.0/bin/node',
      '/usr/local/bin/ember'],
    additionalArgs);
  };

  TryCommand._getConfig = function() {
    return RSVP.resolve({ scenarios: [{ name: 'default' }] });
  };

  TryCommand.run({}, ['default']);
}
