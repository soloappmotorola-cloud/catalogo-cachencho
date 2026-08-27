// Conteo compartido de votos de "Sugerencias de Cachencho". Corre server-side en Netlify
// (no en el navegador del visitante) — guarda en Netlify Blobs, sin exponer ninguna credencial.
import { getStore } from '@netlify/blobs';

const VALID_IDS = new Set([
  'the-conversation-1974',
  'klute-1971',
  'serpico-1973',
  'le-cercle-rouge-1970',
  'high-and-low-1963',
  'bird-crystal-plumage-1970',
  'blood-and-black-lace-1964',
  'lamb-2021',
  'devils-bath-2024',
]);

export default async (req: Request) => {
  const store = getStore('votes');

  if (req.method === 'GET') {
    const counts = (await store.get('counts', { type: 'json' })) ?? {};
    return new Response(JSON.stringify(counts), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => null);
    const id = body?.id;
    const delta = body?.delta;

    if (typeof id !== 'string' || !VALID_IDS.has(id) || (delta !== 1 && delta !== -1)) {
      return new Response(JSON.stringify({ error: 'Solicitud inválida' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const counts = (await store.get('counts', { type: 'json' })) ?? {};
    const next = Math.max(0, (counts[id] ?? 0) + delta);
    counts[id] = next;
    await store.setJSON('counts', counts);

    return new Response(JSON.stringify({ id, count: next }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config = {
  path: '/api/votes',
};
