// Cloudflare Workers API - 壁纸云端同步
export default {
  async fetch(request, env) {
    // 添加 CORS 头
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // 处理 OPTIONS 请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 获取所有壁纸
      if (path === '/api/wallpapers' && request.method === 'GET') {
        const data = await env.WALLPAPER_KV.get('wallpapers', 'json');

        return new Response(JSON.stringify(data || { wallpapers: [], settings: {}, stats: { totalCount: 0 } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 保存壁纸
      if (path === '/api/wallpapers' && request.method === 'POST') {
        const data = await request.json();

        // 保存到 KV
        await env.WALLPAPER_KV.put('wallpapers', JSON.stringify(data));

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 404
      return new Response('Not Found', { status: 404, headers: corsHeaders });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
