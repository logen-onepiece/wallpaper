// Cloudflare Workers - 生成七牛云上传 Token
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
    // CORS 处理
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            }
        })
    }

    try {
        const url = new URL(request.url)
        const key = url.searchParams.get('key') || `wallpapers/${Date.now()}.jpg`

        // 七牛云配置（使用环境变量）
        const accessKey = 'KPPt1MipaBOYrQCH_2IXfaaxy0SbhuLXFoyflYEP'
        const secretKey = 'TnTMZkxk1iOtnOu-bDrPtkFHp87ycKCs7JD07M5u'
        const bucket = 'wallpaper-gallery'

        // 生成上传策略
        const putPolicy = {
            scope: bucket,
            deadline: Math.floor(Date.now() / 1000) + 3600
        }

        // Base64 编码
        const encodedPutPolicy = btoa(JSON.stringify(putPolicy))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')

        // 生成签名
        const sign = await generateHmacSHA1(encodedPutPolicy, secretKey)
        const encodedSign = arrayBufferToBase64(sign)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '')

        // 组装 token
        const uploadToken = `${accessKey}:${encodedSign}:${encodedPutPolicy}`

        return new Response(JSON.stringify({
            success: true,
            token: uploadToken,
            key: key
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        })
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        })
    }
}

// HMAC-SHA1 签名
async function generateHmacSHA1(message, secret) {
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const messageData = encoder.encode(message)

    const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
    )

    return await crypto.subtle.sign('HMAC', key, messageData)
}

// ArrayBuffer 转 Base64
function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
}
