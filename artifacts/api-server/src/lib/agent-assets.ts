import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type AgentAsset = {
  id: string;
  name: string;
  contentType: string;
  size: number;
  downloadUrl: string;
  createdAt: string;
};

type StoredAsset = AgentAsset & { ownerId: string };

function storageDirectory() {
  return process.env.DIGITAL_ASSETS_DIR || path.resolve(process.cwd(), 'data', 'agent-assets');
}

async function readStoredAsset(id: string): Promise<StoredAsset | null> {
  try {
    return JSON.parse(await readFile(path.join(storageDirectory(), `${id}.json`), 'utf8')) as StoredAsset;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return null;
    throw error;
  }
}

export async function listAgentAssets(ownerId: string): Promise<AgentAsset[]> {
  let files: string[];
  try {
    files = await readdir(storageDirectory());
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }
  const assets = await Promise.all(files.filter((file) => file.endsWith('.json')).map((file) => readStoredAsset(file.slice(0, -5))));
  return assets
    .filter((asset): asset is StoredAsset => asset?.ownerId === ownerId)
    .map(({ ownerId: _ownerId, ...asset }) => asset)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function saveAgentAsset(
  ownerId: string,
  name: string,
  contentType: string,
  content: Buffer,
  publicOrigin: string,
): Promise<AgentAsset> {
  const id = randomUUID();
  const directory = storageDirectory();
  const asset: StoredAsset = {
    id,
    ownerId,
    name,
    contentType,
    size: content.byteLength,
    downloadUrl: new URL(`/api/agent/assets/${id}/download`, publicOrigin).toString(),
    createdAt: new Date().toISOString(),
  };
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(path.join(directory, `${id}.bin`), content),
    writeFile(path.join(directory, `${id}.json`), JSON.stringify(asset), 'utf8'),
  ]);
  const { ownerId: _ownerId, ...publicAsset } = asset;
  return publicAsset;
}

export async function deleteAgentAsset(ownerId: string, id: string): Promise<boolean> {
  const asset = await readStoredAsset(id);
  if (!asset || asset.ownerId !== ownerId) return false;
  await Promise.all([
    rm(path.join(storageDirectory(), `${id}.json`), { force: true }),
    rm(path.join(storageDirectory(), `${id}.bin`), { force: true }),
  ]);
  return true;
}

export async function readAgentAsset(id: string): Promise<{ asset: AgentAsset; content: Buffer } | null> {
  const storedAsset = await readStoredAsset(id);
  if (!storedAsset) return null;
  const { ownerId: _ownerId, ...asset } = storedAsset;
  return { asset, content: await readFile(path.join(storageDirectory(), `${id}.bin`)) };
}