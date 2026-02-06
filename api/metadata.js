// Vercel Edge Function - 壁纸元数据管理（使用 Blob 存储 JSON）
import { put, head } from '@vercel/blob';

export const config = {
  runtime: 'edge',
};

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// 元数据文件的 Blob URL（固定）
const METADATA_KEY = 'wallpapers-metadata.json';

export default async function handler(request) {
  // 处理 OPTIONS 请求
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    // 获取壁纸元数据列表
    if (request.method === 'GET') {
      try {
        // 尝试获取元数据文件
        const metadataBlob = await head(METADATA_KEY);

        if (metadataBlob && metadataBlob.url) {
          const response = await fetch(metadataBlob.url);
          const data = await response.json();

          return new Response(
            JSON.stringify(data),
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
      } catch (error) {
        // 文件不存在，返回空数据
        console.log('ℹ️ 元数据文件不存在，返回空数据');
      }

      // 返回默认空数据
      return new Response(
        JSON.stringify({
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

    // 保存壁纸元数据
    if (request.method === 'POST') {
      const data = await request.json();

      // 将 JSON 转换为 Blob 并上传
      const jsonBlob = new Blob([JSON.stringify(data)], {
        type: 'application/json'
      });

      const result = await put(METADATA_KEY, jsonBlob, {
        access: 'public',
        addRandomSuffix: false,
      });

      console.log('✅ 元数据已保存:', result.url);

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
    console.error('❌ API Error:', error);
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
