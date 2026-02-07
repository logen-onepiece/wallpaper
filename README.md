# 🎨 壁纸画廊 - 全栈云同步壁纸管理应用

> 一个功能强大的在线壁纸管理系统，支持跨设备云同步、本地大容量存储、智能缓存，无需 VPN 即可在中国大陆访问。

[![在线演示](https://img.shields.io/badge/演示-在线体验-blue)](https://logen-onepiece.github.io/wallpaper/)
[![技术栈](https://img.shields.io/badge/技术栈-原生JS-yellow)](#技术栈)
[![开源协议](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## ✨ 核心特性

### 🌐 跨设备云同步
- **Supabase 云存储**：免费 1GB 存储空间，全球 CDN 加速
- **云端优先策略**：自动检测云端更新，多设备数据始终保持一致
- **智能增量同步**：只上传未同步的新文件，节省流量
- **免 VPN 访问**：在中国大陆可直连 Supabase，无需翻墙

### 💾 本地大容量存储
- **IndexedDB 存储引擎**：浏览器本地可存储数 GB 壁纸
- **自动压缩优化**：智能压缩图片，节省存储空间
- **离线可用**：即使断网也能浏览本地已缓存的壁纸
- **持久化数据**：刷新页面不丢失，数据永久保存

### 🖼️ 丰富的壁纸管理
- **静态 + 动态壁纸**：同时支持图片（JPG/PNG/WebP）和视频（MP4）
- **批量操作**：批量上传、批量删除、批量导出
- **智能分类**：自动按类型分类，支持分页浏览
- **自适应缩放**：5 种适配模式（拉伸、适应、填充、平铺、居中）
- **全屏预览**：沉浸式壁纸浏览，支持键盘快捷键

### 🎯 优秀的用户体验
- **响应式设计**：完美适配手机、平板、电脑
- **实时预览**：上传时即时显示，无需等待
- **进度提示**：上传进度、同步状态一目了然
- **本地优先加载**：启动快速，云端后台同步
- **零配置使用**：打开即用，无需注册登录

## 🚀 快速开始

### 在线使用（推荐）

直接访问：**https://logen-onepiece.github.io/wallpaper/**

1. 点击「📤 上传壁纸」选择图片或视频
2. 壁纸自动保存到本地并上传到云端
3. 在其他设备打开网页，自动从云端同步数据

### 本地部署

```bash
# 1. 克隆仓库
git clone https://github.com/logen-onepiece/wallpaper.git
cd wallpaper

# 2. 直接用浏览器打开 index.html
open index.html
# 或者启动本地服务器
python -m http.server 8000
```

### 自定义 Supabase（可选）

如果你想使用自己的 Supabase 项目：

1. 注册 [Supabase](https://supabase.com) 账号（免费）
2. 创建新项目，获取 Project URL 和 anon public key
3. 创建 Storage Bucket 名为 `wallpapers`，设置为公开访问
4. 配置 RLS 策略（Row Level Security）：

```sql
-- 允许公开读取
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'wallpapers');

-- 允许公开上传
CREATE POLICY "Public Upload" ON storage.objects
FOR INSERT TO public
WITH CHECK (bucket_id = 'wallpapers');

-- 允许公开更新（覆盖 metadata.json）
CREATE POLICY "Public Update" ON storage.objects
FOR UPDATE TO public
USING (bucket_id = 'wallpapers');
```

5. 修改 `supabase-sync.js` 中的配置：

```javascript
this.supabaseUrl = 'https://你的项目ID.supabase.co';
this.supabaseKey = '你的anon-public-key';
this.bucketName = 'wallpapers';
```

## 🎮 使用指南

### 上传壁纸
- 点击「📤 上传壁纸」按钮
- 选择图片（支持多选）或视频文件
- 自动上传并保存到本地 + 云端

### 查看壁纸
- 点击「静态壁纸」/「动态壁纸」切换分类
- 点击壁纸卡片进入全屏预览
- 使用 ←/→ 键切换上一张/下一张
- 按 ESC 退出全屏

### 调整适配模式
- 全屏预览时，点击底部「适配模式」按钮
- 选择：拉伸、适应、填充、平铺、居中
- 每张壁纸独立记忆适配模式

### 删除壁纸
- 单张删除：全屏预览时点击删除按钮
- 批量删除：开启批量模式，选中后删除

### 导出/导入数据
- **导出数据**：点击「💾 导出数据」下载 JSON 文件
- **导入数据**：点击「📥 导入数据」选择 JSON 文件恢复

### 跨设备同步
- 在设备 A 上传壁纸（自动同步到云端）
- 在设备 B 打开网页（自动从云端下载）
- 图片顺序、适配设置完全一致

## 🛠️ 技术栈

### 前端技术
- **原生 JavaScript**：零依赖，无需构建工具
- **HTML5 + CSS3**：现代化 UI 设计
- **IndexedDB API**：浏览器本地大容量存储
- **Fetch API**：现代化网络请求
- **Web Crypto API**：前端加密签名（备用）

### 云服务
- **Supabase Storage**：对象存储 + CDN
- **GitHub Pages**：静态网站托管
- **Storage API**：S3 兼容的存储接口

### 核心算法
- **云端优先同步**：基于时间戳的增量同步
- **智能排序**：按上传时间倒序，确保一致性
- **本地缓存策略**：优先加载本地，后台同步云端

## 📂 项目结构

```
wallpaper-gallery/
├── index.html              # 主页面
├── app-indexeddb.js        # 应用主逻辑
├── indexeddb-storage.js    # IndexedDB 封装
├── supabase-sync.js        # Supabase 云同步模块
├── test-supabase.html      # Supabase 连通性测试（可选）
└── README.md               # 项目文档
```

### 核心文件说明

- **index.html**：UI 界面，包含所有 HTML/CSS
- **app-indexeddb.js**：应用核心逻辑（上传、删除、预览、同步）
- **indexeddb-storage.js**：IndexedDB 数据库操作封装
- **supabase-sync.js**：云端同步逻辑（上传/下载/智能同步）

## 🔧 核心技术实现

### 1. 云端优先同步策略

```javascript
// 检查云端数据更新时间
const cloudDate = new Date(cloudData.exportDate).getTime();
const lastSyncDate = await this.storage.getSetting('lastCloudSync') || 0;

if (cloudDate > lastSyncDate) {
    // 云端更新，清空本地并同步
    console.log('☁️ 云端数据较新，正在同步...');
    // 清空本地 → 从云端恢复 → 更新时间戳
}
```

### 2. 智能排序保证一致性

```javascript
// 上传时按时间排序
allWallpapers.sort((a, b) => {
    return new Date(b.uploadDate) - new Date(a.uploadDate);
});

// 下载时保持云端数组顺序
for (const wallpaper of cloudData.wallpapers) {
    // 按照云端顺序依次恢复
}
```

### 3. IndexedDB 持久化存储

```javascript
// 数据库设计
const objectStore = db.createObjectStore('wallpapers', { keyPath: 'id' });
objectStore.createIndex('type', 'type', { unique: false });
objectStore.createIndex('uploadDate', 'uploadDate', { unique: false });
```

## 🎯 设计亮点

### 1. 零配置开箱即用
- 无需注册登录
- 无需配置服务器
- 打开网页即可使用

### 2. 免 VPN 中国大陆直连
- Supabase 在中国大陆可直连
- GitHub Pages 可直接访问
- 无需任何代理工具

### 3. 云端优先智能同步
- 自动检测云端更新
- 避免本地旧数据覆盖云端
- 多设备数据始终一致

### 4. 本地优先快速加载
- 启动时先加载本地数据（毫秒级）
- 后台异步同步云端（不阻塞）
- 离线也能正常使用

### 5. 图片顺序完全一致
- 上传时按时间排序
- 云端保存排序后的数组
- 所有设备按相同顺序显示

## 🐛 常见问题

### Q: 为什么清空浏览器缓存后图片消失了？
A: 清空缓存会删除 IndexedDB 数据。刷新页面会自动从云端恢复。

### Q: 支持哪些图片/视频格式？
A: 图片支持 JPG、PNG、WebP、GIF；视频支持 MP4、WebM。

### Q: 为什么有些图片上传后显示不正确？
A: 可能是图片格式或尺寸问题。建议使用常见格式，尺寸不超过 10MB。

### Q: 可以在手机上使用吗？
A: 可以！完全支持移动端，界面自适应。

### Q: 数据安全吗？
A: 数据存储在你的 Supabase 项目中，可以设置为私有访问。

### Q: 免费版 Supabase 够用吗？
A: 免费版提供 1GB 存储 + 2GB 流量/月，足够个人使用。

## 🔄 更新日志

### v2.0.0 (2024-02-07)
- ✨ 迁移到 Supabase 云存储
- ✨ 实现云端优先同步策略
- 🐛 修复图片顺序不一致问题
- 🚀 优化启动速度（本地优先加载）
- 📝 完善文档和使用指南

### v1.0.0 (2024-02-05)
- 🎉 首次发布
- ✨ 支持静态/动态壁纸管理
- ✨ IndexedDB 本地存储
- ✨ 基础导入/导出功能

## 📄 开源协议

MIT License - 自由使用、修改、分发

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 👨‍💻 作者

**Logen OnePiece Team**

- GitHub: [@logen-onepiece](https://github.com/logen-onepiece)
- 项目主页: [wallpaper](https://github.com/logen-onepiece/wallpaper)

## 🌟 致谢

- [Supabase](https://supabase.com) - 提供免费的云存储服务
- [GitHub Pages](https://pages.github.com) - 免费静态网站托管
- [MDN Web Docs](https://developer.mozilla.org) - Web API 文档参考

---

⭐ 如果这个项目对你有帮助，请给个 Star 支持一下！
