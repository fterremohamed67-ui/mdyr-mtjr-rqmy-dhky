export function getCustomerWhatsAppMessage(reply: string, products: Array<{ downloadUrl: string }>): string | null {
  const heading = /رسالة واتساب للعميل\s*:\s*/giu;
  let match: RegExpExecArray | null;
  let lastHeadingIndex = -1;
  let messageStart = -1;

  while ((match = heading.exec(reply)) !== null) {
    lastHeadingIndex = match.index;
    messageStart = heading.lastIndex;
  }

  if (lastHeadingIndex < 0) return null;

  const message = reply.slice(messageStart).trim();
  if (!message || !products.some((product) => message.includes(product.downloadUrl))) return null;
  return message;
}

export function createWhatsAppLink(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}