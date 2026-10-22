import { getAuth } from '@clerk/express';
import { CreateDigitalProductBody } from '@workspace/api-zod';
import { Router, type IRouter, type Request } from 'express';
import { requireAuth } from '../middlewares/requireAuth';
import {
  createDigitalProduct,
  deleteDigitalProduct,
  getPublicOrigin,
  listDigitalProducts,
  readDigitalProductDownload,
} from '../lib/digital-products';

const router: IRouter = Router();

function getOwnerId(req: Request): string {
  try {
    return getAuth(req).userId ?? 'local-development';
  } catch {
    return 'local-development';
  }
}

router.get('/digital-products', requireAuth, async (req, res): Promise<void> => {
  try {
    res.json(await listDigitalProducts(getOwnerId(req)));
  } catch (error) {
    req.log.error({ err: error }, 'Could not list digital products');
    res.status(500).json({ error: 'تعذر تحميل كتالوج المنتجات الرقمية.' });
  }
});

router.post('/digital-products', requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateDigitalProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const product = await createDigitalProduct(getOwnerId(req), parsed.data, getPublicOrigin(req));
    res.status(201).json(product);
  } catch (error) {
    req.log.error({ err: error }, 'Could not create digital product');
    res.status(500).json({ error: 'تعذر حفظ المنتج الرقمي.' });
  }
});

router.delete('/digital-products/:id', requireAuth, async (req, res): Promise<void> => {
  const productId = req.params.id;
  if (typeof productId !== 'string' || !/^[0-9a-f-]{36}$/i.test(productId)) {
    res.status(404).json({ error: 'المنتج غير موجود.' });
    return;
  }

  try {
    const removed = await deleteDigitalProduct(getOwnerId(req), productId);
    if (!removed) {
      res.status(404).json({ error: 'المنتج غير موجود.' });
      return;
    }
    res.status(204).end();
  } catch (error) {
    req.log.error({ err: error }, 'Could not delete digital product');
    res.status(500).json({ error: 'تعذر حذف المنتج الرقمي.' });
  }
});

router.get('/digital-products/:id/download', async (req, res): Promise<void> => {
  const productId = req.params.id;
  if (typeof productId !== 'string' || !/^[0-9a-f-]{36}$/i.test(productId)) {
    res.status(404).end();
    return;
  }

  try {
    const download = await readDigitalProductDownload(productId);
    if (!download) {
      res.status(404).end();
      return;
    }
    const fileName = `${download.title.replace(/[^\p{L}\p{N}-]+/gu, '-').slice(0, 80) || 'digital-product'}.md`;
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(download.content);
  } catch (error) {
    req.log.error({ err: error }, 'Could not read digital product download');
    res.status(500).end();
  }
});

export default router;