// GitHub 云端同步模块
class GitHubSync {
    constructor(localDB) {
        this.localDB = localDB; // IndexedDB 实例
        this.enabled = false;

        // GitHub 配置
        this.config = {
            owner: 'a995936731-commits',
            repo: 'wallpaper',
            branch: 'main',
            dataPath: 'data/wallpaper-data.json',
            token: localStorage.getItem('GITHUB_TOKEN') || window.GITHUB_TOKEN || 'YOUR_GITHUB_TOKEN'
        };

        this.currentFileSHA = null; // 当前云端文件的 SHA
        this.lastSyncTime = null; // 上次同步时间
    }

    // 初始化同步
    async initialize() {
        try {
            // 检查配置是否完整
            if (this.config.token === 'YOUR_GITHUB_TOKEN') {
                console.log('⚠️ GitHub Token 未配置，云端同步功能未启用');
                return false;
            }

            this.enabled = true;
            console.log('✅ GitHub 云端同步已启用');

            // 检查是否有云端更新
            await this.checkForUpdates();

            return true;
        } catch (error) {
            console.error('❌ GitHub 同步初始化失败:', error);
            return false;
        }
    }

    // 检查云端更新
    async checkForUpdates() {
        if (!this.enabled) return null;

        try {
            const cloudData = await this.downloadFromCloud();

            if (!cloudData) {
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

    // 上传到 GitHub
    async uploadToCloud(data) {
        if (!this.enabled) {
            console.log('ℹ️ GitHub 同步未启用');
            return false;
        }

        try {
            const url = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.dataPath}`;

            // 先获取当前文件的 SHA（如果存在）
            try {
                const response = await fetch(url, {
                    headers: {
                        'Authorization': `token ${this.config.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (response.ok) {
                    const fileData = await response.json();
                    this.currentFileSHA = fileData.sha;
                }
            } catch (err) {
                console.log('ℹ️ 云端文件不存在，将创建新文件');
            }

            // 准备上传数据
            const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));

            const payload = {
                message: `更新壁纸数据 - ${new Date().toLocaleString('zh-CN')}`,
                content: content,
                branch: this.config.branch
            };

            // 如果文件存在，需要提供 SHA
            if (this.currentFileSHA) {
                payload.sha = this.currentFileSHA;
            }

            // 上传到 GitHub
            const uploadResponse = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${this.config.token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(payload)
            });

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                throw new Error(`上传失败: ${errorText}`);
            }

            const result = await uploadResponse.json();
            this.currentFileSHA = result.content.sha;
            this.lastSyncTime = new Date().toISOString();

            console.log('✅ 数据已上传到 GitHub');
            return true;
        } catch (error) {
            console.error('❌ 上传到 GitHub 失败:', error);
            throw error;
        }
    }

    // 从 GitHub 下载
    async downloadFromCloud() {
        if (!this.enabled) return null;

        try {
            // 使用 Raw 地址直接下载（不需要 Token，国内可访问）
            const url = `https://raw.githubusercontent.com/${this.config.owner}/${this.config.repo}/${this.config.branch}/${this.config.dataPath}`;

            const response = await fetch(url, {
                cache: 'no-cache' // 禁用缓存，确保获取最新数据
            });

            if (!response.ok) {
                if (response.status === 404) {
                    console.log('ℹ️ 云端文件不存在');
                    return null;
                }
                throw new Error(`下载失败: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ 已从 GitHub 下载数据');
            return data;
        } catch (error) {
            console.error('❌ 从 GitHub 下载失败:', error);
            return null;
        }
    }

    // 同步到云端（导出 + 上传）
    async syncToCloud() {
        if (!this.enabled) {
            throw new Error('GitHub 同步未启用，请先配置 Token');
        }

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

            // 2. 上传到 GitHub
            await this.uploadToCloud(exportData);

            return exportData.stats;
        } catch (error) {
            console.error('❌ 同步到云端失败:', error);
            throw error;
        }
    }

    // 从云端同步到本地
    async syncFromCloud() {
        if (!this.enabled) {
            throw new Error('GitHub 同步未启用');
        }

        try {
            // 1. 下载云端数据
            const cloudData = await this.downloadFromCloud();

            if (!cloudData || !cloudData.wallpapers) {
                throw new Error('云端数据无效或不存在');
            }

            // 2. 返回数据供导入功能使用
            this.lastSyncTime = cloudData.exportDate;
            return cloudData;
        } catch (error) {
            console.error('❌ 从云端同步失败:', error);
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
window.GitHubSync = GitHubSync;
