const storageKey = 'smart-merchant.digital-products';

export type DigitalProduct = {
  id: string;
  title: string;
  description: string;
  price: number;
  downloadUrl: string;
  createdAt: string;
};

export function getLegacyDigitalProducts(): DigitalProduct[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey) || '[]') as unknown;
    if (!Array.isArray(stored)) return [];

    return stored.filter((product): product is DigitalProduct =>
      Boolean(product) &&
      typeof product.id === 'string' &&
      typeof product.title === 'string' &&
      typeof product.description === 'string' &&
      typeof product.price === 'number' &&
      typeof product.downloadUrl === 'string' &&
      typeof product.createdAt === 'string',
    );
  } catch {
    return [];
  }
}

export function removeLegacyDigitalProduct(productId: string): void {
  const products = getLegacyDigitalProducts().filter((product) => product.id !== productId);
  window.localStorage.setItem(storageKey, JSON.stringify(products));
}