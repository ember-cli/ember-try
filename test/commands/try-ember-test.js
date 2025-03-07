import { expect } from 'chai';
import { tryEmber } from '../../lib/commands/try-ember.mjs';

describe('commands/try-ember', () => {
  it('passes the correct options to `getConfig`', async () => {
    let getConfigOptions;

    await tryEmber({
      configPath: 'foo/bar/widget.js',
      cwd: 'foo',
      ember: '1.13.0',

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
      versionCompatibility: { ember: '1.13.0' },
    });
  });
});
