// Cloudflare Pages API를 서버 사이드에서 호출하는 프록시 함수

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  try {
    const { token, accountId } = await context.request.json();
    if (!token) {
      return json({ success: false, error: 'token 필드가 필요합니다.' }, 400);
    }

    // accountId 없으면 Account: Read 권한으로 자동 조회
    let resolvedAccountId = accountId;
    if (!resolvedAccountId) {
      const accRes  = await cfFetch(token, '/accounts?per_page=1');
      const accData = await accRes.json();
      if (!accData.success || !accData.result?.length) {
        return json({ success: false, error: 'Account ID를 찾을 수 없습니다. 설정에서 직접 입력하거나 Account: Read 권한을 토큰에 추가하세요.' }, 400);
      }
      resolvedAccountId = accData.result[0].id;
    }

    // Pages 프로젝트 목록 조회 (Pages API는 페이지네이션 미지원 — 파라미터 없이 호출)
    const pagesRes  = await cfFetch(token, `/accounts/${encodeURIComponent(resolvedAccountId)}/pages/projects`);
    const pagesData = await pagesRes.json();
    if (!pagesData.success) {
      return json({ success: false, error: pagesData.errors?.[0]?.message || 'Cloudflare API 오류' }, 502);
    }
    const allProjects = pagesData.result ?? [];

    return json({ success: true, accountId: resolvedAccountId, projects: allProjects });
  } catch (err) {
    return json({ success: false, error: err.message }, 500);
  }
}

function cfFetch(token, path) {
  return fetch(`https://api.cloudflare.com/client/v4${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}
