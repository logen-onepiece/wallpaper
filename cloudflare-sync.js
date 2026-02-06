// Cloudflare Workers 云端同步模块（零配置方案）
class CloudflareSync {
    constructor(localDB) {
        this.localDB = localDB; // IndexedDB 实例
        this.enabled = true; // 默认启用，无需配置

        // API 配置
        this.apiUrl = 'https://wallpaper-api.a995936731.workers.dev/api/wallpapers';

        this.lastSyncTime = null; // 上次同步时间
    }

    // 初始化同步（无需任何配置）
    async initialize() {
        try {
            console.log('✅ Cloudflare 云端同步已启用（零配置模式）');

            // 自动从云端下载最新数据（无提示，静默同步）
            await this.autoSyncFromCloud();

            return true;
        } catch (error) {
            console.error('❌ Cloudflare 同步初始化失败:', error);
            return false;
        }
    }

    // 自动从云端同步（静默，无提示）
    async autoSyncFromCloud() {
        try {
            const cloudData = await this.downloadFromCloud();

            if (!cloudData || !cloudData.wallpapers || cloudData.wallpapers.length === 0) {
                console.log('☁️ 云端暂无数据，使用本地数据');
                return null;
            }

            // 获取本地数据
            const localWallpapers = await this.localDB.getAllWallpapers();
            const cloudDate = new Date(cloudData.exportDate);
            const localDate = this.lastSyncTime ? new Date(this.lastSyncTime) : new Date(0);

            // 如果云端数据更新，自动下载（无提示）
            if (cloudDate > localDate || cloudData.wallpapers.length !== localWallpapers.length) {
                console.log(`☁️ 自动从云端同步 ${cloudData.wallpapers.length} 张壁纸`);
                this.lastSyncTime = cloudData.exportDate;
                return cloudData;
            }

            console.log('✅ 本地数据已是最新');
            return null;
        } catch (error) {
            console.error('❌ 自动同步失败:', error);
            return null;
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

    // 显示进度提示（可选）
    showProgress(message, force = false) {
        // 只在强制显示或出错时显示
        if (force && window.galleryDB && window.galleryDB.showToast) {
            window.galleryDB.showToast(message);
        }
    }

    // 检查云端更新
    async checkForUpdates() {
        try {
            const cloudData = await this.downloadFromCloud();

            if (!cloudData || !cloudData.wallpapers) {
                console.log('☁️ 云端暂无数据');
                return null;
            }

            // 获取本地数据
            const localWallpapers = await this.localDB.getAllWallpapers();
            const localCount = localWallpapers.length;
            const cloudCount = cloudData.wallpapers.length;

            // 比较数据版本
            const cloudDate = new Date(cloudData.exportDate);
            const localDate = this.lastSyncTime ? new Date(this.lastSyncTime) : new Date(0);

            if (cloudDate > localDate || cloudCount !== localCount) {
                console.log(`☁️ 云端有更新: 云端 ${cloudCount} 张，本地 ${localCount} 张`);
                return {
                    hasUpdate: true,
                    cloudCount,
                    localCount,
                    cloudDate: cloudData.exportDate,
                    data: cloudData
                };
            }

            console.log('✅ 本地数据已是最新');
            return { hasUpdate: false };
        } catch (error) {
            console.error('❌ 检查云端更新失败:', error);
            return null;
        }
    }

    // 上传到 Cloudflare Workers（自动，静默）
    async uploadToCloud(data) {
        try {
            const response = await this.fetchWithTimeout(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            }, 60000); // 60秒超时，因为可能数据量大

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`上传失败: ${errorText}`);
            }

            this.lastSyncTime = new Date().toISOString();
            console.log('✅ 已自动同步到云端，共', data.wallpapers?.length || 0, '张壁纸');
            return true;
        } catch (error) {
            console.error('❌ 自动同步到云端失败:', error);
            // 静默失败，不打断用户
            return false;
        }
    }

    // 从 Cloudflare Workers 下载（静默）
    async downloadFromCloud() {
        try {
            const response = await this.fetchWithTimeout(this.apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                cache: 'no-cache' // 禁用缓存，确保获取最新数据
            }, 30000);

            if (!response.ok) {
                if (response.status === 404) {
                    console.log('ℹ️ 云端暂无数据');
                    return null;
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ 已从云端下载数据，共', data.wallpapers?.length || 0, '张壁纸');

            return data;
        } catch (error) {
            console.error('❌ 从云端下载失败:', error);
            return null;
        }
    }

    // 自动同步到云端（在上传、删除壁纸后自动调用）
    async autoSyncToCloud() {
        try {
            // 1. 导出本地数据
            const allWallpapers = await this.localDB.getAllWallpapers();
            const fitModes = await this.localDB.getSetting('fitModes') || {};

            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                wallpapers: allWallpapers,
                settings: {
                    fitModes: fitModes
                },
                stats: {
                    staticCount: allWallpapers.filter(w => w.type === 'image').length,
                    dynamicCount: allWallpapers.filter(w => w.type === 'video').length,
                    totalCount: allWallpapers.length
                }
            };

            // 2. 自动上传到云端（后台执行，不阻塞）
            this.uploadToCloud(exportData).catch(err => {
                console.error('后台同步失败:', err);
            });

            return exportData.stats;
        } catch (error) {
            console.error('❌ 自动同步失败:', error);
            // 静默失败
            return null;
        }
    }

    // 手动同步到云端（保留给手动操作）
    async syncToCloud() {
        try {
            const allWallpapers = await this.localDB.getAllWallpapers();
            const fitModes = await this.localDB.getSetting('fitModes') || {};

            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                wallpapers: allWallpapers,
                settings: {
                    fitModes: fitModes
                },
                stats: {
                    staticCount: allWallpapers.filter(w => w.type === 'image').length,
                    dynamicCount: allWallpapers.filter(w => w.type === 'video').length,
                    totalCount: allWallpapers.length
                }
            };

            await this.uploadToCloud(exportData);
            return exportData.stats;
        } catch (error) {
            console.error('❌ 同步到云端失败:', error);
            throw error;
        }
    }

    // 从云端同步到本地
    async syncFromCloud() {
        try {
            this.showProgress('🌐 开始从云端下载...');

            // 1. 下载云端数据
            const cloudData = await this.downloadFromCloud();

            if (!cloudData || !cloudData.wallpapers) {
                throw new Error('云端数据无效或不存在');
            }

            this.showProgress(`📦 准备导入 ${cloudData.wallpapers.length} 张壁纸...`);

            // 2. 返回数据供导入功能使用
            this.lastSyncTime = cloudData.exportDate;

            this.showProgress('✅ 数据下载完成！');

            return cloudData;
        } catch (error) {
            console.error('❌ 从云端同步失败:', error);

            // 详细的错误提示
            let errorMessage = '❌ 同步失败: ';
            if (error.message.includes('超时')) {
                errorMessage += '网络超时，请重试';
            } else if (error.message.includes('无效')) {
                errorMessage += '云端数据无效';
            } else {
                errorMessage += error.message;
            }

            this.showProgress(errorMessage);
            throw error;
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
window.CloudflareSync = CloudflareSync;
