// Upstash Redis REST API -- no npm packages needed.
// Env vars auto-added when you create an Upstash Redis store
// and connect it to your Vercel project:
//   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

const KEY = 'mealplanner:weeks';

function getConfig() {
  // Support both naming conventions (Upstash direct and legacy Vercel KV)
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return { url, token };
}

async function kvGet(key) {
  const { url, token } = getConfig();
  const resp = await fetch(`${url}/get/${key}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json();
  if (data.result === null) return null;
  try { return JSON.parse(data.result); } catch { return data.result; }
}

async function kvSet(key, value) {
  const { url, token } = getConfig();
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['SET', key, JSON.stringify(value)]),
  });
  return resp.ok;
}

export default async function handler(req, res) {
  const { url, token } = getConfig();
  if (!url || !token) {
    return res.status(500).json({
      error: 'Redis not configured. Create an Upstash Redis store in Vercel Storage and connect it to this project.',
    });
  }

  // GET -- load shared data
  if (req.method === 'GET') {
    try {
      const weeks = await kvGet(KEY);
      return res.status(200).json({ weeks: weeks || [] });
    } catch (err) {
      console.error('Redis read error:', err);
      return res.status(500).json({ error: 'Failed to load data: ' + err.message });
    }
  }

  // POST -- save shared data
  if (req.method === 'POST') {
    try {
      const { weeks } = req.body;
      if (!Array.isArray(weeks)) {
        return res.status(400).json({ error: 'Expected { weeks: [...] }' });
      }
      const ok = await kvSet(KEY, weeks);
      if (!ok) throw new Error('Redis write failed');
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Redis write error:', err);
      return res.status(500).json({ error: 'Failed to save data: ' + err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
