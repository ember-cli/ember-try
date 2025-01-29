import TryEachTask from '../tasks/try-each.js';
import getConfig from '../utils/config.js';

export async function tryEmber({
  configPath,
  cwd,
  ember,
  skipCleanup,

  // For testing purposes:
  _getConfig = getConfig,
  _TryEachTask = TryEachTask,
}) {
  const config = await _getConfig({
    configPath,
    cwd,
    versionCompatibility: { ember },
  });

  const tryEachTask = new _TryEachTask({ config, cwd });

  await tryEachTask.run(config.scenarios, { skipCleanup });
}
