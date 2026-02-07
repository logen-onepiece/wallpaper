// Supabase 云存储同步模块
class SupabaseSync {
    constructor(localDB) {
        this.localDB = localDB;
        this.enabled = true;

        // Supabase 配置
        this.supabaseUrl = 'https://amdocskosalcqljlawwy.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtZG9jc2tvc2FsY3Fsamxhd3d5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NDY0ODIsImV4cCI6MjA4NjAyMjQ4Mn0.LuWks2A-4mNY49_7Crc4OWVhIW2jeKaEgrZXypMlS_c';
        this.bucketName = 'wallpapers';

        this.lastSyncTime = null;
    }

    async initialize() {
        try {
            console.log('✅ Supabase 存储已启用');
            console.log('📦 存储桶:', this.bucketName);
            console.log('🌐 服务器:', this.supabaseUrl);

            // 测试连接
            const testUrl = `${this.supabaseUrl}/storage/v1/bucket/${this.bucketName}`;
            const response = await fetch(testUrl, {
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`
                }
            });

            if (response.ok) {
                console.log('✅ Supabase 连接成功');
                return true;
            } else {
                console.warn('⚠️ Supabase 连接测试失败，但继续运行');
                return true;
            }
        } catch (error) {
            console.error('❌ Supabase 初始化失败:', error);
            return false;
        }
    }

    // 上传文件到 Supabase Storage
    async uploadFile(wallpaper) {
        try {
            if (wallpaper.cloudUrl) {
                console.log('ℹ️ 文件已存在于云端:', wallpaper.id);
                return wallpaper.cloudUrl;
            }

            // 获取壁纸数据
            const base64Data = wallpaper.data || wallpaper.url || wallpaper.src;
            if (!base64Data) {
                console.warn('⚠️ 壁纸数据不存在，跳过上传:', wallpaper.id);
                return null;
            }

            const response = await fetch(base64Data);
            const blob = await response.blob();

            const fileName = `${wallpaper.id}.${wallpaper.type === 'video' ? 'mp4' : 'jpg'}`;
            const filePath = `wallpapers/${fileName}`;

            console.log('🔄 正在上传文件到 Supabase:', wallpaper.id, `(${(blob.size / 1024 / 1024).toFixed(2)} MB)`);

            // 使用 Supabase Storage API 上传
            const uploadUrl = `${this.supabaseUrl}/storage/v1/object/${this.bucketName}/${filePath}`;

            const uploadResponse = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': blob.type
                },
                body: blob
            });

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                console.error('❌ Supabase 返回错误:', uploadResponse.status, errorText);
                throw new Error(`上传失败: ${uploadResponse.status} - ${errorText}`);
            }

            // 生成公开访问 URL
            const publicUrl = `${this.supabaseUrl}/storage/v1/object/public/${this.bucketName}/${filePath}`;

            console.log('✅ 文件已上传到 Supabase:', publicUrl);
            return publicUrl;
        } catch (error) {
            console.error('❌ 文件上传失败:', error);
            throw error;
        }
    }

    // 从 Supabase 下载元数据
    async downloadFromCloud() {
        try {
            console.log('🔄 开始从 Supabase 下载数据...');

            const metadataUrl = `${this.supabaseUrl}/storage/v1/object/public/${this.bucketName}/metadata.json?t=${Date.now()}`;
            console.log('📡 请求 URL:', metadataUrl);

            const response = await fetch(metadataUrl, {
                cache: 'no-cache'
            });

            console.log('📥 响应状态:', response.status, response.statusText);

            if (!response.ok) {
                if (response.status === 404) {
                    console.log('ℹ️ 云端暂无数据');
                    return null;
                }

                const errorText = await response.text();
                console.error('❌ Supabase 返回错误:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ 已从 Supabase 下载数据，共', data.wallpapers?.length || 0, '张壁纸');

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

            console.log('🔄 开始同步文件到 Supabase...');
            const wallpapersWithCloudUrls = [];

            for (const wallpaper of allWallpapers) {
                try {
                    if (!wallpaper.cloudUrl) {
                        const cloudUrl = await this.uploadFile(wallpaper);
                        wallpapersWithCloudUrls.push({
                            ...wallpaper,
                            cloudUrl: cloudUrl,
                            data: undefined,
                            url: undefined,
                            src: undefined
                        });

                        // 更新本地记录
                        await this.localDB.saveWallpaper({
                            ...wallpaper,
                            cloudUrl: cloudUrl
                        });
                    } else {
                        wallpapersWithCloudUrls.push({
                            ...wallpaper,
                            data: undefined,
                            url: undefined,
                            src: undefined
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
                wallpapers: wallpapersWithCloudUrls,
                settings: { fitModes },
                stats: {
                    staticCount: wallpapersWithCloudUrls.filter(w => w.type === 'image').length,
                    dynamicCount: wallpapersWithCloudUrls.filter(w => w.type === 'video').length,
                    totalCount: wallpapersWithCloudUrls.length
                }
            };

            const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
            const metadataPath = 'metadata.json';

            console.log('📤 准备上传元数据，路径:', metadataPath);
            console.log('📊 元数据内容:', metadata);

            // 上传 metadata.json
            const uploadUrl = `${this.supabaseUrl}/storage/v1/object/${this.bucketName}/${metadataPath}`;

            const uploadResponse = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json',
                    'x-upsert': 'true'  // 允许覆盖已存在的文件
                },
                body: metadataBlob
            });

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                console.error('❌ 元数据上传错误:', uploadResponse.status, errorText);
                throw new Error(`元数据上传失败: ${uploadResponse.status} - ${errorText}`);
            }

            console.log('✅ 元数据已同步到 Supabase');
            this.lastSyncTime = new Date().toISOString();

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

window.SupabaseSync = SupabaseSync;
