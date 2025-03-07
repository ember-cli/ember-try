import getConfig from '../utils/config.js';
import { log } from '../utils/console.js';

export async function config({ configPath, cwd }) {
  const config = await getConfig({ configPath, cwd });

  log(JSON.stringify(config, null, 2));
}
