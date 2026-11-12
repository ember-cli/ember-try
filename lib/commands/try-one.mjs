import TryEachTask from '../tasks/try-each.js';
import getConfig from '../utils/config.js';

export async function tryOne({
  configPath,
  cwd,
  scenarioName,
  skipCleanup,

  // For testing purposes:
  _args = process.argv,
  _getConfig = getConfig,
  _TryEachTask = TryEachTask,
}) {
  const config = await _getConfig({ configPath, cwd });
  const scenario = config.scenarios.find((s) => s.name === scenarioName);

  if (scenario === undefined) {
    throw new Error('The `try:one` command requires a scenario name specified in the config.');
  }

  const tryEachTask = new _TryEachTask({
    commandArgs: getCommandArgs(_args),
    config,
    cwd,
  });

  await tryEachTask.run([scenario], { skipCleanup });
}

export function getCommandArgs(args) {
  const separatorIndex = args.indexOf('---');

  if (separatorIndex === -1) {
    return [];
  } else {
    return args.slice(separatorIndex + 1);
  }
}
