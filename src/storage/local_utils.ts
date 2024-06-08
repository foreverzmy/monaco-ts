import { mkdir, exists } from '@zenfs/core/promises';
import { join } from '../utils/path';

export const mkdirRecursive = async (parent: string, dir: string) => {
  const [firstPath, ...rest] = dir.split('/');
  const restPath = rest.join('/');
  const current = join(parent, firstPath);
  
  const ok = await exists(current);
  if (!ok) {
    await mkdir(current);
  }

  if (!restPath) {
    return;
  }
  
  await mkdirRecursive(current, restPath);
}
