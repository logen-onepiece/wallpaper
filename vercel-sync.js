// Vercel Blob 云端同步模块（零配置方案）
class VercelSync {
    constructor(localDB) {
        this.localDB = localDB; // IndexedDB 实例
        this.enabled = true; // 默认启用，无需配置

        // API 配置 - 将在部署后自动使用 Vercel 域名
        this.baseUrl = window.location.origin;
        this.metadataUrl = this.baseUrl + '/api/wallpapers'; // 元数据 API
        this.uploadUrl = this.baseUrl + '/api/upload'; // 文件上传 API
        this.deleteUrl = this.baseUrl + '/api/delete'; // 文件删除 API

        this.lastSyncTime = null; // 上次同步时间
    }

    // 初始化同步（无需任何配置）
    async initialize() {
        try {
            console.log('✅ Vercel Blob 云端同步已启用（实时同步模式）');
            console.log('📡 API 地址:', this.metadataUrl);
            return true;
        } catch (error) {
            console.error('❌ Vercel 同步初始化失败:', error);
            return false;
        }
    }

    // 带超时的 fetch
    async fetchWithTimeout(url, options = {}, timeout = 30000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('网络请求超时，请检查网络连接');
            }
            throw error;
        }
    }

    // 上传单个文件到 Blob
    async uploadFileToBlobStorage(wallpaper) {
        try {
            // 如果已经有 blobUrl，说明已经上传过了
            if (wallpaper.blobUrl) {
                console.log('ℹ️ 文件已存在于云端:', wallpaper.id);
                return wallpaper.blobUrl;
            }

            // 将 Base64 转换为 File 对象
            const base64Data = wallpaper.data || wallpaper.url;
            const response = await fetch(base64Data);
            const blob = await response.blob();

            const file = new File([blob], `${wallpaper.id}.${wallpaper.type === 'video' ? 'mp4' : 'jpg'}`, {
                type: blob.type
            });

            // 创建 FormData
            const formData = new FormData();
            formData.append('file', file);
            formData.append('id', wallpaper.id);
            formData.append('type', wallpaper.type);

            console.log('🔄 正在上传文件到 Blob 存储:', wallpaper.id, `(${(file.size / 1024 / 1024).toFixed(2)} MB)`);

            // 上传到 Vercel Blob（60秒超时，因为可能是大文件）
            const uploadResponse = await this.fetchWithTimeout(this.uploadUrl, {
                method: 'POST',
                body: formData
            }, 60000);

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                throw new Error(`上传失败: ${errorText}`);
            }

            const result = await uploadResponse.json();
            console.log('✅ 文件已上传到 Blob 存储:', result.url);

            return result.url;
        } catch (error) {
            console.error('❌ 文件上传失败:', error);
            throw error;
        }
    }

    // 从 Blob 删除文件
    async deleteFileFromBlobStorage(blobUrl) {
        try {
            if (!blobUrl) return;

            console.log('🗑️ 正在删除 Blob 文件:', blobUrl);

            const response = await this.fetchWithTimeout(this.deleteUrl, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url: blobUrl })
            }, 10000);

            if (!response.ok) {
                throw new Error(`删除失败: ${response.statusText}`);
            }

            console.log('✅ 文件已从 Blob 删除');
        } catch (error) {
            console.error('❌ 删除文件失败:', error);
            // 静默失败，不影响主流程
        }
    }

    // 上传元数据到云端
    async uploadMetadataToCloud(metadata, retryCount = 0) {
        const maxRetries = 2; // 最多重试 2 次

        try {
            console.log('🔄 开始上传元数据到云端...');
            const response = await this.fetchWithTimeout(this.metadataUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(metadata)
            }, 30000);

            console.log('📡 云端响应状态:', response.status, response.statusText);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`上传失败: ${errorText}`);
            }

            this.lastSyncTime = new Date().toISOString();
            console.log('✅ 元数据已同步到云端');
            return true;
        } catch (error) {
            console.error('❌ 元数据同步失败:', error);

            // 如果是网络错误且还有重试次数，则重试
            if (retryCount < maxRetries && (error.name === 'AbortError' || error.message.includes('网络'))) {
                console.log(`⏳ ${retryCount + 1}秒后重试...`);
                await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
                return this.uploadMetadataToCloud(metadata, retryCount + 1);
            }

            return false;
        }
    }

    // 从云端下载元数据
    async downloadFromCloud() {
        try {
            console.log('🔄 开始从云端下载元数据...');
            const response = await this.fetchWithTimeout(this.metadataUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                cache: 'no-cache' // 禁用缓存，确保获取最新数据
            }, 30000);

            console.log('📡 云端响应状态:', response.status, response.statusText);

            if (!response.ok) {
                if (response.status === 404) {
                    console.log('ℹ️ 云端暂无数据');
                    return null;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ 已从云端下载元数据，共', data.wallpapers?.length || 0, '张壁纸');

            return data;
        } catch (error) {
            console.error('❌ 从云端下载失败:', error);
            return null;
        }
    }

    // 自动同步到云端（在上传、删除壁纸后自动调用）
    async autoSyncToCloud() {
        try {
            // 1. 获取本地数据
            const allWallpapers = await this.localDB.getAllWallpapers();
            const fitModes = await this.localDB.getSetting('fitModes') || {};

            // 2. 上传尚未上传的文件到 Blob 存储
            console.log('🔄 开始同步文件到 Blob 存储...');
            const wallpapersWithBlobUrls = [];

            for (const wallpaper of allWallpapers) {
                try {
                    // 如果没有 blobUrl，上传文件
                    if (!wallpaper.blobUrl) {
                        const blobUrl = await this.uploadFileToBlobStorage(wallpaper);
                        wallpapersWithBlobUrls.push({
                            ...wallpaper,
                            blobUrl: blobUrl,
                            // 不再保存 Base64 data 到云端元数据（节省空间）
                            data: undefined,
                            url: undefined
                        });

                        // 更新本地数据库，保存 blobUrl
                        await this.localDB.saveWallpaper({
                            ...wallpaper,
                            blobUrl: blobUrl
                        });
                    } else {
                        wallpapersWithBlobUrls.push({
                            ...wallpaper,
                            // 不保存 Base64 data 到云端
                            data: undefined,
                            url: undefined
                        });
                    }
                } catch (error) {
                    console.error('❌ 上传文件失败，跳过:', wallpaper.id, error);
                    // 继续处理其他文件
                }
            }

            // 3. 准备元数据（只包含 URL 引用，不包含文件内容）
            const metadata = {
                version: '2.0', // 使用 Blob 存储的新版本
                exportDate: new Date().toISOString(),
                wallpapers: wallpapersWithBlobUrls,
                settings: {
                    fitModes: fitModes
                },
                stats: {
                    staticCount: wallpapersWithBlobUrls.filter(w => w.type === 'image').length,
                    dynamicCount: wallpapersWithBlobUrls.filter(w => w.type === 'video').length,
                    totalCount: wallpapersWithBlobUrls.length
                }
            };

            // 4. 上传元数据到云端
            const uploadSuccess = await this.uploadMetadataToCloud(metadata);

            if (uploadSuccess) {
                return { success: true, stats: metadata.stats };
            } else {
                return { success: false, stats: metadata.stats };
            }
        } catch (error) {
            console.error('❌ 自动同步失败:', error);
            return { success: false, error: error.message };
        }
    }

    // 获取云端数据统计
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

// 导出
window.VercelSync = VercelSync;
