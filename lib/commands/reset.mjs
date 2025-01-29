import ResetTask from '../tasks/reset.js';
import getConfig from '../utils/config.js';

export async function reset({ configPath, cwd }) {
  const config = await getConfig({ configPath, cwd });
  const resetTask = new ResetTask({ config, cwd });

  await resetTask.run();
}
