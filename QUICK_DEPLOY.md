# ⚡ 5分钟快速部署 - Cloudflare Workers 云端同步

## 🎯 一句话总结

**无需任何配置，打开网页就能多设备自动同步壁纸！**

---

## 🚀 快速部署（5个命令）

```bash
# 1. 安装工具
npm install -g wrangler

# 2. 登录 Cloudflare（会打开浏览器）
wrangler login

# 3. 进入项目目录
cd /Users/mac137/wallpaper-gallery

# 4. 创建 KV 存储
wrangler kv:namespace create WALLPAPER_KV

# 5. 部署（复制输出中的 Worker URL）
wrangler deploy
```

---

## ✏️ 配置（只需 2 步）

### 第 1 步：填写 KV ID

运行第 4 步后，会输出类似这样的内容：
```
{ binding = "WALLPAPER_KV", id = "abc123def456" }
```

打开 `wrangler.toml`，填入这个 ID：
```toml
[[kv_namespaces]]
binding = "WALLPAPER_KV"
id = "abc123def456"  # ← 填入你的 ID
```

### 第 2 步：填写 Worker URL

运行第 5 步后，会输出类似这样的内容：
```
Published wallpaper-api
  https://wallpaper-api.abc123.workers.dev
```

打开 `cloudflare-sync.js`，第 9 行，填入你的 URL：
```javascript
this.apiUrl = 'https://wallpaper-api.abc123.workers.dev/api/wallpapers';
```

---

## 🎉 提交并部署

```bash
git add .
git commit -m "启用零配置云端同步"
git push
```

**完成！** Cloudflare Pages 会自动部署，几分钟后就能使用了！

---

## 🧪 测试

### 在电脑上：
1. 访问你的网站
2. 上传几张壁纸
3. 点击 **"☁️ 同步到云端"**

### 在手机上：
1. 访问同一个网站
2. **自动提示有更新**
3. 点击确定
4. 壁纸自动下载完成！

---

## 💡 常见问题

### Q: 需要绑定银行卡吗？
**A**: 不需要！Cloudflare Workers 免费额度完全够用。

### Q: 每个设备都要配置吗？
**A**: 不需要！只需配置一次 Worker，所有设备打开网页就能同步。

### Q: 国内能访问吗？
**A**: 能！Cloudflare Workers 在国内可以访问，无需 VPN。

### Q: 部署后提示"云端数据无效"？
**A**: 检查 `cloudflare-sync.js` 中的 URL 是否正确填写。

### Q: 数据安全吗？
**A**: 数据存储在你自己的 Cloudflare 账号中，只有你能访问。

---

## 📖 详细文档

完整部署指南请查看：[CLOUDFLARE_WORKERS_SETUP.md](./CLOUDFLARE_WORKERS_SETUP.md)

---

**享受零配置的云端同步吧！** ☁️✨
