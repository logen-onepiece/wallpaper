// Vercel Edge Function - 壁纸云端同步 API
import { kv } from '@vercel/kv';

export const config = {
  runtime: 'edge',
};

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(request) {
  // 处理 OPTIONS 请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    // 获取所有壁纸
    if (request.method === 'GET') {
      const data = await kv.get('wallpapers');

      return new Response(
        JSON.stringify(data || {
          wallpapers: [],
          settings: {},
          stats: { totalCount: 0 }
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          }
        }
      );
    }

    // 保存壁纸
    if (request.method === 'POST') {
      const data = await request.json();

      // 保存到 Vercel KV
      await kv.set('wallpapers', data);

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    // 不支持的方法
    return new Response('Method Not Allowed', {
      status: 405,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal Server Error'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
}
