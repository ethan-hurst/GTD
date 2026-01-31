import { getStore } from '@netlify/blobs';
import type { Context } from '@netlify/functions';

export default async (req: Request, context: Context) => {
  // Only allow GET
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(req.url);
    const deviceId = url.searchParams.get('deviceId');

    // Validate deviceId
    if (!deviceId || typeof deviceId !== 'string') {
      return new Response(JSON.stringify({ error: 'Missing or invalid deviceId parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate deviceId format (should be 64-char hex SHA-256 hash)
    if (!/^[a-f0-9]{64}$/.test(deviceId)) {
      return new Response(JSON.stringify({ error: 'Invalid deviceId format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Retrieve encrypted blob from Netlify Blobs
    const store = getStore('sync-data');
    const encryptedBlob = await store.get(deviceId, { type: 'text' });

    if (!encryptedBlob) {
      return new Response(JSON.stringify({
        found: false,
        message: 'No sync data found for this device'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      found: true,
      encryptedBlob,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('sync-pull error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
