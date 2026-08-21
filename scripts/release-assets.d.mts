export function expectedAssetNames(version: string): string[];
export function reconcileAssets(
  version: string,
  existingDir: string,
  builtDir: string,
): {
  action: 'upload' | 'noop' | 'fail';
  uploads: string[];
  differing: { name: string; existing: string; built: string }[];
};
