// 七牛云对象存储同步模块（前端直传 + 前端生成 Token）
class QiniuSync {
    constructor(localDB) {
        this.localDB = localDB;
        this.enabled = true;

        // 七牛云配置
        this.bucket = 'wallpaper-gallery';
        this.domain = 'https://wallpaper-gallery.s3.cn-south-1.qiniucs.com';

        // 七牛云密钥（注意：这样做不安全，但为了简化部署）
        // 更安全的做法是使用后端生成 Token，但那样需要服务器
        this.accessKey = 'KPPt1MipaBOYrQCH_2IXfaaxy0SbhuLXFoyflYEP';
        this.secretKey = 'TnTMZkxk1iOtnOu-bDrPtkFHp87ycKCs7JD07M5u';

        this.lastSyncTime = null;
    }

    async initialize() {
        try {
            console.log('✅ 七牛云存储已启用（实时同步模式）');
            console.log('📦 存储空间:', this.bucket);
            console.log('🌐 CDN 域名:', this.domain);
            return true;
        } catch (error) {
            console.error('❌ 七牛云同步初始化失败:', error);
            return false;
        }
    }

    // 生成上传 Token（前端生成）
    async generateUploadToken(key) {
        try {
            const putPolicy = {
                scope: `${this.bucket}:${key}`,
                deadline: Math.floor(Date.now() / 1000) + 3600, // 1小时有效期
            };

            console.log('🔐 生成上传凭证:', { bucket: this.bucket, key, deadline: putPolicy.deadline });

            // 1. 将 putPolicy 转为 JSON 并 Base64 编码
            const encodedPutPolicy = this.utf8ToBase64(JSON.stringify(putPolicy));

            // 2. 对 encodedPutPolicy 进行 HMAC-SHA1 签名
            const signatureBuffer = await this.hmacSha1(encodedPutPolicy, this.secretKey);

            // 3. 将签名结果 Base64 编码
            const encodedSign = this.base64UrlSafeEncode(signatureBuffer);

            // 4. 拼接最终 token
            const uploadToken = `${this.accessKey}:${encodedSign}:${encodedPutPolicy}`;

            console.log('✅ 上传凭证已生成');
            return uploadToken;
        } catch (error) {
            console.error('❌ 生成上传凭证失败:', error);
            throw error;
        }
    }

    // Base64 编码（URL Safe，符合七牛云规范）
    base64UrlSafeEncode(str) {
        // 如果输入是字符串，先转换为 ArrayBuffer
        let buffer;
        if (typeof str === 'string') {
            const bytes = [];
            for (let i = 0; i < str.length; i++) {
                bytes.push(str.charCodeAt(i));
            }
            buffer = new Uint8Array(bytes);
        } else {
            buffer = new Uint8Array(str);
        }

        // 转换为 base64
        let binary = '';
        for (let i = 0; i < buffer.length; i++) {
            binary += String.fromCharCode(buffer[i]);
        }

        // URL Safe Base64
        return btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    // UTF-8 字符串转 Base64（用于 putPolicy）
    utf8ToBase64(str) {
        return btoa(unescape(encodeURIComponent(str)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    // HMAC-SHA1 签名（使用原生实现，返回 ArrayBuffer）
    async hmacSha1(message, secret) {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(secret);
        const messageData = encoder.encode(message);

        const key = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-1' },
            false,
            ['sign']
        );

        const signature = await crypto.subtle.sign('HMAC', key, messageData);
        return signature; // 返回 ArrayBuffer，由 base64UrlSafeEncode 处理
    }

    // 上传文件到七牛云
    async uploadFileToQiniu(wallpaper) {
        try {
            if (wallpaper.qiniuUrl) {
                console.log('ℹ️ 文件已存在于云端:', wallpaper.id);
                return wallpaper.qiniuUrl;
            }

            const base64Data = wallpaper.data || wallpaper.url;
            const response = await fetch(base64Data);
            const blob = await response.blob();

            const fileName = `wallpapers/${wallpaper.id}.${wallpaper.type === 'video' ? 'mp4' : 'jpg'}`;
            const token = this.generateUploadToken(fileName);

            const formData = new FormData();
            formData.append('key', fileName);
            formData.append('token', token);
            formData.append('file', blob);

            console.log('🔄 正在上传文件到七牛云:', wallpaper.id, `(${(blob.size / 1024 / 1024).toFixed(2)} MB)`);

            const uploadResponse = await fetch('https://upload.qiniup.com', {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) {
                throw new Error('上传失败');
            }

            const result = await uploadResponse.json();
            const fileUrl = `${this.domain}/${result.key}`;

            console.log('✅ 文件已上传到七牛云:', fileUrl);
            return fileUrl;
        } catch (error) {
            console.error('❌ 文件上传失败:', error);
            throw error;
        }
    }

    // 从七牛云下载元数据
    async downloadFromCloud() {
        try {
            console.log('🔄 开始从七牛云下载数据...');

            const metadataUrl = `${this.domain}/metadata.json?t=${Date.now()}`;
            const response = await fetch(metadataUrl, {
                cache: 'no-cache'
            });

            if (!response.ok) {
                if (response.status === 404 || response.status === 612) {
                    console.log('ℹ️ 云端暂无数据');
                    return null;
                }
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ 已从七牛云下载数据，共', data.wallpapers?.length || 0, '张壁纸');

            return data;
        } catch (error) {
            console.error('❌ 从云端下载失败:', error);
            return null;
        }
    }

    // 自动同步到云端
    async autoSyncToCloud() {
        try {
            const allWallpapers = await this.localDB.getAllWallpapers();
            const fitModes = await this.localDB.getSetting('fitModes') || {};

            console.log('🔄 开始同步文件到七牛云...');
            const wallpapersWithQiniuUrls = [];

            for (const wallpaper of allWallpapers) {
                try {
                    if (!wallpaper.qiniuUrl) {
                        const qiniuUrl = await this.uploadFileToQiniu(wallpaper);
                        wallpapersWithQiniuUrls.push({
                            ...wallpaper,
                            qiniuUrl: qiniuUrl,
                            data: undefined,
                            url: undefined
                        });

                        await this.localDB.saveWallpaper({
                            ...wallpaper,
                            qiniuUrl: qiniuUrl
                        });
                    } else {
                        wallpapersWithQiniuUrls.push({
                            ...wallpaper,
                            data: undefined,
                            url: undefined
                        });
                    }
                } catch (error) {
                    console.error('❌ 上传文件失败，跳过:', wallpaper.id, error);
                }
            }

            // 上传元数据
            const metadata = {
                version: '2.0',
                exportDate: new Date().toISOString(),
                wallpapers: wallpapersWithQiniuUrls,
                settings: { fitModes },
                stats: {
                    staticCount: wallpapersWithQiniuUrls.filter(w => w.type === 'image').length,
                    dynamicCount: wallpapersWithQiniuUrls.filter(w => w.type === 'video').length,
                    totalCount: wallpapersWithQiniuUrls.length
                }
            };

            const token = this.generateUploadToken('metadata.json');
            const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });

            const formData = new FormData();
            formData.append('key', 'metadata.json');
            formData.append('token', token);
            formData.append('file', metadataBlob);

            const uploadResponse = await fetch('https://upload.qiniup.com', {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) {
                throw new Error('元数据上传失败');
            }

            console.log('✅ 元数据已同步到七牛云');
            return { success: true, stats: metadata.stats };
        } catch (error) {
            console.error('❌ 自动同步失败:', error);
            return { success: false, error: error.message };
        }
    }

    async getCloudStats() {
        try {
            const cloudData = await this.downloadFromCloud();
            if (!cloudData) return null;

            return {
                totalCount: cloudData.stats?.totalCount || cloudData.wallpapers.length,
                exportDate: cloudData.exportDate,
                version: cloudData.version
            };
        } catch (error) {
            console.error('❌ 获取云端统计失败:', error);
            return null;
        }
    }
}

window.QiniuSync = QiniuSync;
