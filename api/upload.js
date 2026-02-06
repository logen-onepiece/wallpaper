// Vercel Edge Function - 上传壁纸文件到 Blob
import { put } from '@vercel/blob';

export const config = {
  runtime: 'edge',
  maxDuration: 60, // 最大 60 秒，支持大文件上传
};

// CORS 头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const wallpaperId = formData.get('id');
    const type = formData.get('type'); // 'image' 或 'video'

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 上传到 Vercel Blob
    const blob = await put(`wallpapers/${wallpaperId}`, file, {
      access: 'public',
      addRandomSuffix: false, // 使用固定的 ID，方便管理
    });

    console.log('✅ 文件已上传到 Blob:', blob.url);

    return new Response(
      JSON.stringify({
        success: true,
        url: blob.url,
        size: file.size,
        type: file.type
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error) {
    console.error('❌ 上传失败:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Upload failed'
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
