import { expect } from 'chai';
import { tryEach } from '../../lib/commands/try-each.mjs';

describe('commands/try-each', () => {
  it('passes the correct options to `getConfig`', async () => {
    let getConfigOptions;

    await tryEach({
      configPath: 'foo/bar/widget.js',
      cwd: 'foo',

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
});
