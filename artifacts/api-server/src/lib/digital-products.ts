import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Request } from 'express';

export type DigitalProduct = {
  id: string;
  title: string;
  description: string;
  price: number;
  downloadUrl: string;
  createdAt: string;
};

type StoredDigitalProduct = DigitalProduct & {
  ownerId: string;
  contentFile?: string;
};

export type DigitalProductInput = {
  title: string;
  description: string;
  price: number;
  downloadUrl?: string;
  content?: string;
};

function storageDirectory() {
  return process.env.DIGITAL_PRODUCTS_DIR || path.resolve(process.cwd(), 'data', 'digital-products');
}

export function getPublicOrigin(req: Request): string {
  const configuredOrigin = process.env.APP_URL?.trim().replace(/\/+$/, '');
  if (configuredOrigin) return configuredOrigin;

  if (process.env.NODE_ENV === 'development') {
    try {
      const requestOrigin = new URL(req.get('origin') ?? '');
      if (requestOrigin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(requestOrigin.hostname)) {
        return requestOrigin.origin;
      }
    } catch {
      // Use the API request host when there is no valid local browser origin.
    }
  }

  return `${req.protocol}://${req.get('host')}`;
}

async function readRecord(fileName: string): Promise<StoredDigitalProduct | null> {
  try {
    return JSON.parse(await readFile(path.join(storageDirectory(), fileName), 'utf8')) as StoredDigitalProduct;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return null;
    throw error;
  }
}

function publicProduct({ ownerId: _ownerId, contentFile: _contentFile, ...product }: StoredDigitalProduct): DigitalProduct {
  return product;
}

export async function listDigitalProducts(ownerId: string): Promise<DigitalProduct[]> {
  let files: string[];
  try {
    files = await readdir(storageDirectory());
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }

  const products = await Promise.all(
    files.filter((fileName) => fileName.endsWith('.json')).map((fileName) => readRecord(fileName)),
  );
  return products
    .filter((product): product is StoredDigitalProduct => product?.ownerId === ownerId)
    .map(publicProduct)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function createDigitalProduct(
  ownerId: string,
  input: DigitalProductInput,
  publicOrigin: string,
): Promise<DigitalProduct> {
  const id = randomUUID();
  const directory = storageDirectory();
  const contentFile = input.content ? `${id}.md` : undefined;
  const record: StoredDigitalProduct = {
    id,
    ownerId,
    title: input.title,
    description: input.description,
    price: input.price,
    downloadUrl: input.downloadUrl ?? new URL(`/api/digital-products/${id}/download`, publicOrigin).toString(),
    createdAt: new Date().toISOString(),
    ...(contentFile ? { contentFile } : {}),
  };

  await mkdir(directory, { recursive: true });
  if (contentFile) await writeFile(path.join(directory, contentFile), input.content!, 'utf8');
  const recordPath = path.join(directory, `${id}.json`);
  const tempPath = `${recordPath}.tmp`;
  try {
    await writeFile(tempPath, JSON.stringify(record), 'utf8');
    await rename(tempPath, recordPath);
  } catch (error) {
    await Promise.all([
      rm(tempPath, { force: true }),
      ...(contentFile ? [rm(path.join(directory, contentFile), { force: true })] : []),
    ]);
    throw error;
  }
  return publicProduct(record);
}

export async function deleteDigitalProduct(ownerId: string, productId: string): Promise<boolean> {
  const fileName = `${productId}.json`;
  const record = await readRecord(fileName);
  if (!record || record.ownerId !== ownerId) return false;

  await Promise.all([
    rm(path.join(storageDirectory(), fileName), { force: true }),
    ...(record.contentFile ? [rm(path.join(storageDirectory(), record.contentFile), { force: true })] : []),
  ]);
  return true;
}

export async function readDigitalProductDownload(productId: string): Promise<{ title: string; content: string } | null> {
  const record = await readRecord(`${productId}.json`);
  if (!record?.contentFile) return null;
  return {
    title: record.title,
    content: await readFile(path.join(storageDirectory(), record.contentFile), 'utf8'),
  };
}