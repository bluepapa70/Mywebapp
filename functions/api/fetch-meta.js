// 외부 URL의 meta description/title을 서버 사이드에서 추출하는 프록시 함수

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

export async function onRequestGet(context) {
  const { searchParams } = new URL(context.request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) return json({ error: 'url 파라미터가 필요합니다.' }, 400);

  // URL 유효성 검사 (http/https만 허용)
  try {
    const u = new URL(targetUrl);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return json({ error: 'http/https URL만 지원합니다.' }, 400);
    }
  } catch {
    return json({ error: '올바르지 않은 URL입니다.' }, 400);
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Vibecoding/1.0; +https://mywebapp-b2f.pages.dev)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('html')) {
      return json({ title: '', desc: '' });
    }

    // <head> 부분만 읽어 메모리/시간 절약 (최대 64KB)
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let html = '';
    while (html.length < 65536) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      if (/<\/head>/i.test(html) || /<body[\s>]/i.test(html)) break;
    }
    reader.cancel().catch(() => {});

    return json({ title: extractTitle(html), desc: extractDesc(html) });
  } catch (err) {
    return json({ title: '', desc: '', error: err.message });
  }
}

// ── 파서 ──
function extractDesc(html) {
  return (
    attr(html, /property=["']og:description["'][^>]+content=["']([^"']{1,300})["']/i) ||
    attr(html, /content=["']([^"']{1,300})["'][^>]+property=["']og:description["']/i) ||
    attr(html, /name=["']description["'][^>]+content=["']([^"']{1,300})["']/i) ||
    attr(html, /content=["']([^"']{1,300})["'][^>]+name=["']description["']/i) ||
    ''
  );
}

function extractTitle(html) {
  return (
    attr(html, /property=["']og:title["'][^>]+content=["']([^"']{1,120})["']/i) ||
    attr(html, /content=["']([^"']{1,120})["'][^>]+property=["']og:title["']/i) ||
    (html.match(/<title[^>]*>([^<]{1,120})<\/title>/i)?.[1]?.trim()) ||
    ''
  );
}

function attr(html, re) {
  return html.match(re)?.[1]?.trim() ?? '';
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}
