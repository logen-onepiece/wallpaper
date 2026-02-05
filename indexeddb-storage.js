// IndexedDB 存储管理器 - 支持更大容量
class IndexedDBStorage {
    constructor() {
        this.dbName = 'WallpaperDB';
        this.version = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // 创建存储对象
                if (!db.objectStoreNames.contains('wallpapers')) {
                    const objectStore = db.createObjectStore('wallpapers', { keyPath: 'id' });
                    objectStore.createIndex('type', 'type', { unique: false });
                    objectStore.createIndex('uploadDate', 'uploadDate', { unique: false });
                }

                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    // 保存壁纸
    async saveWallpaper(wallpaper) {
        if (!this.db) {
            throw new Error('数据库未初始化');
        }
        const transaction = this.db.transaction(['wallpapers'], 'readwrite');
        const objectStore = transaction.objectStore('wallpapers');
        return new Promise((resolve, reject) => {
            const request = objectStore.put(wallpaper);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 获取所有壁纸
    async getAllWallpapers() {
        if (!this.db) {
            console.warn('数据库未初始化，返回空数组');
            return [];
        }
        const transaction = this.db.transaction(['wallpapers'], 'readonly');
        const objectStore = transaction.objectStore('wallpapers');
        return new Promise((resolve, reject) => {
            const request = objectStore.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 按类型获取壁纸
    async getWallpapersByType(type) {
        const transaction = this.db.transaction(['wallpapers'], 'readonly');
        const objectStore = transaction.objectStore('wallpapers');
        const index = objectStore.index('type');
        return new Promise((resolve, reject) => {
            const request = index.getAll(type);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // 删除壁纸
    async deleteWallpaper(id) {
        if (!this.db) {
            throw new Error('数据库未初始化');
        }
        const transaction = this.db.transaction(['wallpapers'], 'readwrite');
        const objectStore = transaction.objectStore('wallpapers');
        return new Promise((resolve, reject) => {
            const request = objectStore.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // 清空所有壁纸
    async clearWallpapers() {
        if (!this.db) {
            throw new Error('数据库未初始化');
        }
        const transaction = this.db.transaction(['wallpapers'], 'readwrite');
        const objectStore = transaction.objectStore('wallpapers');
        return new Promise((resolve, reject) => {
            const request = objectStore.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // 保存设置
    async saveSetting(key, value) {
        if (!this.db) {
            throw new Error('数据库未初始化');
        }
        const transaction = this.db.transaction(['settings'], 'readwrite');
        const objectStore = transaction.objectStore('settings');
        return new Promise((resolve, reject) => {
            const request = objectStore.put({ key, value });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // 获取设置
    async getSetting(key) {
        if (!this.db) {
            return null;
        }
        const transaction = this.db.transaction(['settings'], 'readonly');
        const objectStore = transaction.objectStore('settings');
        return new Promise((resolve, reject) => {
            const request = objectStore.get(key);
            request.onsuccess = () => resolve(request.result?.value);
            request.onerror = () => reject(request.error);
        });
    }

    // 获取存储使用量（估算）
    async getStorageEstimate() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            return await navigator.storage.estimate();
        }
        return { usage: 0, quota: 0 };
    }
}

// 导出
window.IndexedDBStorage = IndexedDBStorage;
