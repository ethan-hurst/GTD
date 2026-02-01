import { getStore } from '@netlify/blobs';
import type { Context } from '@netlify/functions';

export default async (req: Request, context: Context) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await req.json();
    const { deviceId, encryptedBlob, contentHash } = body;

    // Validate required fields
    if (!deviceId || typeof deviceId !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid deviceId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!encryptedBlob || typeof encryptedBlob !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid encryptedBlob' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Enforce max payload size (10 MB)
    if (encryptedBlob.length > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Payload too large (max 10MB)' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Store encrypted blob in Netlify Blobs
    const store = getStore('sync-data');
    await store.set(deviceId, encryptedBlob);

    // Store content hash alongside blob (optional field for backwards compatibility)
    if (contentHash && typeof contentHash === 'string') {
      await store.set(deviceId + '-hash', contentHash);
    }

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('sync-push error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
