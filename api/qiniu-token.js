// Vercel Serverless Function - 生成七牛云上传 Token
const crypto = require('crypto');

module.exports = async (req, res) => {
    // 允许跨域
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { key } = req.query;

        // 七牛云配置（从环境变量读取）
        const accessKey = process.env.QINIU_ACCESS_KEY || 'KPPt1MipaBOYrQCH_2IXfaaxy0SbhuLXFoyflYEP';
        const secretKey = process.env.QINIU_SECRET_KEY || 'TnTMZkxk1iOtnOu-bDrPtkFHp87ycKCs7JD07M5u';
        const bucket = 'wallpaper-gallery';

        // 生成上传策略
        const putPolicy = {
            scope: bucket,
            deadline: Math.floor(Date.now() / 1000) + 3600, // 1小时有效
        };

        // 编码策略
        const encodedPutPolicy = urlSafeBase64Encode(JSON.stringify(putPolicy));

        // HMAC-SHA1 签名
        const sign = crypto
            .createHmac('sha1', secretKey)
            .update(encodedPutPolicy)
            .digest();

        // Base64 编码签名
        const encodedSign = urlSafeBase64Encode(sign);

        // 拼接 token
        const uploadToken = `${accessKey}:${encodedSign}:${encodedPutPolicy}`;

        res.status(200).json({
            success: true,
            token: uploadToken,
            key: key || `wallpapers/${Date.now()}.jpg`
        });
    } catch (error) {
        console.error('生成 token 失败:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// URL Safe Base64 编码
function urlSafeBase64Encode(data) {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8');
    return buffer
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}
