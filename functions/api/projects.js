// 프로젝트 목록을 Cloudflare KV에 저장/조회하는 Pages Function API

const KV_KEY = 'projects';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet(context) {
  try {
    const kv = context.env.PROJECTS_KV;
    if (!kv) return json({ projects: [] });
    const data = await kv.get(KV_KEY);
    const projects = data ? JSON.parse(data) : [];
    return json({ projects });
  } catch (err) {
    return json({ projects: [], error: err.message }, 500);
  }
}

export async function onRequestPost(context) {
  try {
    const kv = context.env.PROJECTS_KV;
    if (!kv) return json({ error: 'KV 바인딩이 설정되지 않았습니다.' }, 503);
    const body = await context.request.json();
    if (!Array.isArray(body.projects)) {
      return json({ error: 'projects 배열이 필요합니다.' }, 400);
    }
    await kv.put(KV_KEY, JSON.stringify(body.projects));
    return json({ ok: true });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}
