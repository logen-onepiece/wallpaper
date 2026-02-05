# 💾 存储空间详解

## 📊 LocalStorage 容量限制

### 浏览器限制
不同浏览器的 LocalStorage 限制各不相同：

| 浏览器 | 容量限制 | 备注 |
|--------|----------|------|
| Chrome | **10 MB** | 推荐使用 |
| Firefox | **10 MB** | 稳定可靠 |
| Safari | **5 MB** | 限制较严格 |
| Edge | **10 MB** | 与 Chrome 相同 |
| Opera | **10 MB** | 与 Chrome 相同 |

### 实际可用空间
由于 Base64 编码的开销（约 33% 增加），实际可存储的原始文件大小：
- **Chrome/Firefox/Edge**: 约 **7-8 MB** 原始文件
- **Safari**: 约 **3-4 MB** 原始文件

---

## 🎯 存储空间取决于什么？

### 完全由你的上传量决定！

**这是单用户应用**，所有存储空间都属于你：
- ✅ **无需多用户**：只有你一个人使用
- ✅ **无需登录**：直接访问即可
- ✅ **多设备访问**：每个设备独立存储 10MB

### 示例计算

假设使用 Chrome 浏览器（10MB 限制）：

**静态图片**
- 200KB 图片 → 可存储约 **40 张**
- 500KB 图片 → 可存储约 **16 张**
- 1MB 图片 → 可存储约 **8 张**

**动态视频**
- 1MB 视频 → 可存储约 **8 个**
- 2MB 视频 → 可存储约 **4 个**
- 5MB 视频 → 可存储约 **1-2 个**

**混合存储**
- 20 张图片（每张 300KB）≈ 6MB
- 2 个视频（每个 2MB）≈ 4MB
- **总计**: 约 10MB，刚好用满

---

## 🔧 如何最大化存储空间？

### 1. 图片优化
推荐使用在线压缩工具：
- **TinyPNG**: https://tinypng.com/ (可压缩 70%)
- **Squoosh**: https://squoosh.app/ (Google 出品)
- **Compressor.io**: https://compressor.io/

**示例**：
- 原始图片: 2MB
- TinyPNG 压缩后: 600KB (节省 70%)
- 画质损失: 肉眼几乎无法察觉

### 2. 视频优化
使用 FFmpeg 命令行工具：

```bash
# 压缩为 1080p，保持高质量
ffmpeg -i input.mp4 -vf scale=1920:1080 -crf 28 -preset slow output.mp4

# 更激进的压缩（适合壁纸）
ffmpeg -i input.mp4 -vf scale=1920:1080 -crf 32 -preset slow output.mp4

# 转换为 WEBM（更小体积）
ffmpeg -i input.mp4 -c:v libvpx-vp9 -crf 30 -b:v 0 output.webm
```

**参数说明**：
- `-crf 28`: 质量参数（18-28 高质量，28-32 中等质量）
- `-preset slow`: 压缩速度（越慢压缩率越高）
- `-vf scale=1920:1080`: 缩放到 1080p

### 3. 格式选择
| 格式 | 优势 | 劣势 |
|------|------|------|
| **WEBP** | 比 JPG 小 30% | Safari 支持较晚 |
| **JPG** | 兼容性最好 | 体积较大 |
| **PNG** | 无损压缩 | 体积很大（不推荐） |
| **MP4 (H.264)** | 兼容性好 | 中等体积 |
| **WEBM (VP9)** | 体积最小 | Safari 不支持 |

---

## 📈 存储监控

### 查看当前使用量

在浏览器控制台运行：
```javascript
// 查看 LocalStorage 使用量
const data = localStorage.getItem('static_wallpapers') || '';
const data2 = localStorage.getItem('dynamic_wallpapers') || '';
const totalBytes = new Blob([data, data2]).size;
const totalMB = (totalBytes / 1024 / 1024).toFixed(2);
console.log(`当前使用: ${totalMB} MB`);
```

### 应用内提示
当存储超过 **8 MB** 时，会自动显示警告提示。

---

## 🌐 多设备访问说明

### 每个设备独立存储

**场景示例**：
- 设备 A（电脑）：上传 50 张图片 → 使用 10MB
- 设备 B（手机）：上传 30 张图片 → 使用 6MB
- 设备 C（平板）：上传 20 张图片 → 使用 4MB

**总结**：
- 每个设备有自己的 10MB 空间
- 不同设备数据不共享
- 你可以在每个设备上存储不同的壁纸

### 如何同步数据？

由于是纯前端应用，数据不会自动同步。如需同步：

**方法 1: 手动导出/导入（未来功能）**
```javascript
// 导出数据
const backup = {
    static: localStorage.getItem('static_wallpapers'),
    dynamic: localStorage.getItem('dynamic_wallpapers'),
    fitModes: localStorage.getItem('wallpaper_fit_modes')
};
const json = JSON.stringify(backup);
// 下载为 JSON 文件
```

**方法 2: 浏览器同步（Chrome）**
- Chrome 浏览器会自动同步 LocalStorage
- 登录同一个 Google 账号即可同步数据
- 需要在设置中启用"同步所有数据"

---

## ⚠️ 注意事项

### 数据会丢失的情况
1. **清除浏览器数据**：会删除所有 LocalStorage
2. **使用隐私模式**：退出后数据消失
3. **浏览器卸载重装**：数据可能丢失

### 备份建议
- 定期导出重要壁纸
- 保留原始文件
- 使用云盘备份（OneDrive/iCloud）

---

## 💡 实用建议

### 最佳实践

1. **图片壁纸**
   - 分辨率：1920×1080 或 2560×1440
   - 格式：WEBP 或压缩后的 JPG
   - 大小：每张 200-500KB

2. **视频壁纸**
   - 分辨率：1920×1080
   - 格式：MP4 (H.264)
   - 大小：1-2MB
   - 时长：10-30 秒（循环播放）

3. **存储分配**
   - 静态壁纸：6MB（约 20-30 张）
   - 动态壁纸：4MB（约 2-4 个）

---

## 🚀 扩展存储方案

### 未来可能的升级

如果 10MB 不够用，可考虑：

1. **IndexedDB**
   - 容量：50MB - 无限制（需用户许可）
   - 复杂度：较高
   - 适合：大量高清壁纸

2. **云端存储**
   - 后端 API + 对象存储（S3/OSS）
   - 容量：几乎无限
   - 缺点：需要服务器成本

3. **PWA + Service Worker**
   - 离线缓存
   - 容量：可达 GB 级别
   - 体验：接近原生应用

---

## 📞 总结

✅ **10MB 完全够用**（精心优化后）
✅ **多设备独立存储**（每个设备 10MB）
✅ **无需登录**（直接使用）
✅ **免费无限制**（静态托管）

**建议配置**：
- 上传前压缩图片/视频
- 单张图片 < 500KB
- 单个视频 < 2MB
- 定期清理不需要的壁纸

享受你的专属壁纸库！🎨
