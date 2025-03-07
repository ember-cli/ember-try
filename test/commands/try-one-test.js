import { expect } from 'chai';
import { getCommandArgs, tryOne } from '../../lib/commands/try-one.mjs';

describe('commands/try-one', () => {
  describe('getCommandArgs', () => {
    it('returns args after `---` as command args', () => {
      const args = getCommandArgs([
        'ember',
        'try:one',
        'foo-bar-scenario',
        '--skip-cleanup',
        '---',
        'ember',
        'build',
      ]);

      expect(args).to.deep.equal(['ember', 'build']);
    });

    it('returns no command args if no `---`', () => {
      const args = getCommandArgs(['ember', 'try:one', 'foo-bar-scenario', '--skip-cleanup']);

      expect(args).to.deep.equal([]);
    });
  });

  describe('run', () => {
    it('throws if no scenario name is provided', async () => {
      let error;

      try {
        await tryOne({
          _getConfig: () => ({ scenarios: [{ name: 'default' }] }),
          _TryEachTask: class {
            run() {}
          },
        });
      } catch (e) {
        error = e;
      }

      expect(error.message).to.equal(
        'The `try:one` command requires a scenario name specified in the config.',
      );
    });

    it('throws if no scenario is found for the provided scenario name', async () => {
      let error;

      try {
        await tryOne({
          scenarioName: 'foo',

          _getConfig: () => ({ scenarios: [{ name: 'default' }] }),
          _TryEachTask: class {
            run() {}
          },
        });
      } catch (e) {
        error = e;
      }

      expect(error.message).to.equal(
        'The `try:one` command requires a scenario name specified in the config.',
      );
    });

    it('passes the correct options to `getConfig`', async () => {
      let getConfigOptions;

      await tryOne({
        configPath: 'foo/bar/widget.js',
        cwd: 'foo',
        scenarioName: 'default',

        _getConfig: (options) => {
          getConfigOptions = options;

          return { scenarios: [{ name: 'default' }] };
        },
        _TryEachTask: class {
          run() {}
        },
      });

      expect(getConfigOptions).to.deep.equal({
        configPath: 'foo/bar/widget.js',
        cwd: 'foo',
      });
    });

    it('sets command on task init', async () => {
      await testCommandSetsTheseAsCommandArgs('try:one default', []);
      await testCommandSetsTheseAsCommandArgs('try:one default --- ember help', ['ember', 'help']);
      await testCommandSetsTheseAsCommandArgs('try:one default --- ember help --json', [
        'ember',
        'help',
        '--json',
      ]);
      await testCommandSetsTheseAsCommandArgs('try:one default --- ember help --json=true', [
        'ember',
        'help',
        '--json=true',
      ]);
      await testCommandSetsTheseAsCommandArgs('try:one default --- ember help --json true', [
        'ember',
        'help',
        '--json',
        'true',
      ]);
    });
  });
});

async function testCommandSetsTheseAsCommandArgs(command, expectedArgs) {
  await tryOne({
    scenarioName: 'default',

    _args: ['/usr/local/Cellar/node/5.3.0/bin/node', '/usr/local/bin/ember', ...command.split(' ')],
    _getConfig: () => ({ scenarios: [{ name: 'default' }] }),
    _TryEachTask: class {
      constructor(options) {
        expect(options.commandArgs).to.deep.equal(expectedArgs);
      }

      run() {}
    },
  });
}
