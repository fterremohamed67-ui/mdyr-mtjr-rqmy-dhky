// @ts-nocheck
import { getAuth } from '@clerk/express';
import express, { Router, type IRouter, type Request } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { deleteAgentAsset, listAgentAssets, readAgentAsset, saveAgentAsset } from '../lib/agent-assets.js';
import { getPublicOrigin } from '../lib/digital-products.js';

const router: IRouter = Router();
const uploadBody = express.raw({ type: 'application/octet-stream', limit: '20mb' });

function getOwnerId(req: Request): string {
  try {
    return getAuth(req).userId ?? 'local-development';
  } catch {
    return 'local-development';
  }
}

router.get('/agent/assets', requireAuth, async (req, res): Promise<void> => {
  try {
    res.json(await listAgentAssets(getOwnerId(req)));
  } catch (error) {
    req.log.error({ err: error }, 'Could not list agent assets');
    res.status(500).json({ error: 'تعذر تحميل الأصول الرقمية.' });
  }
});

router.post('/agent/assets', requireAuth, uploadBody, async (req, res): Promise<void> => {
  if (!Buffer.isBuffer(req.body) || req.body.byteLength === 0) {
    res.status(400).json({ error: 'اختر ملفاً صالحاً قبل الرفع.' });
    return;
  }

  let name: string;
  try {
    name = decodeURIComponent(req.get('x-asset-name') ?? 'asset').trim();
  } catch {
    res.status(400).json({ error: 'اسم الملف غير صالح.' });
    return;
  }
  name = name.split(/[\\/]/u).pop()?.replace(/[\u0000-\u001f]/gu, '').slice(0, 180) ?? '';
  if (!name) {
    res.status(400).json({ error: 'اسم الملف غير صالح.' });
    return;
  }

  const contentType = req.get('x-asset-type')?.slice(0, 120) || 'application/octet-stream';
  try {
    const asset = await saveAgentAsset(getOwnerId(req), name, contentType, req.body, getPublicOrigin(req));
    res.status(201).json(asset);
  } catch (error) {
    req.log.error({ err: error }, 'Could not upload agent asset');
    res.status(500).json({ error: 'تعذر حفظ الأصل الرقمي.' });
  }
});

router.delete('/agent/assets/:id', requireAuth, async (req, res): Promise<void> => {
  const assetId = req.params.id;
  if (typeof assetId !== 'string' || !/^[0-9a-f-]{36}$/i.test(assetId)) {
    res.status(404).json({ error: 'الأصل غير موجود.' });
    return;
  }
  try {
    if (!await deleteAgentAsset(getOwnerId(req), assetId)) {
      res.status(404).json({ error: 'الأصل غير موجود.' });
      return;
    }
    res.status(204).end();
  } catch (error) {
    req.log.error({ err: error }, 'Could not delete agent asset');
    res.status(500).json({ error: 'تعذر حذف الأصل الرقمي.' });
  }
});

router.get('/agent/assets/:id/download', async (req, res): Promise<void> => {
  const assetId = req.params.id;
  if (typeof assetId !== 'string' || !/^[0-9a-f-]{36}$/i.test(assetId)) {
    res.status(404).end();
    return;
  }
  try {
    const result = await readAgentAsset(assetId);
    if (!result) {
      res.status(404).end();
      return;
    }
    res.setHeader('Content-Type', result.asset.contentType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(result.asset.name)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(result.content);
  } catch (error) {
    req.log.error({ err: error }, 'Could not download agent asset');
    res.status(500).end();
  }
});

export default router;
