# 🚀 Cloudflare Workers 云端同步部署指南

## 🎯 概述

本指南将帮助你部署 Cloudflare Workers API，实现**零配置、多设备自动同步**的在线相册效果。

### ✨ 特点
- ✅ **零配置** - 无需 Token，无需任何手动配置
- ✅ **自动同步** - 打开网页自动检测云端更新
- ✅ **多设备互联** - 电脑、手机、平板无缝同步
- ✅ **免费使用** - Cloudflare Workers 免费额度足够个人使用
- ✅ **国内可访问** - 无需 VPN

---

## 📋 部署步骤

### 第一步：安装 Wrangler CLI

```bash
# 安装 Cloudflare Workers 命令行工具
npm install -g wrangler

# 验证安装
wrangler --version
```

### 第二步：登录 Cloudflare

```bash
# 登录你的 Cloudflare 账号（会打开浏览器）
wrangler login
```

> 如果你没有 Cloudflare 账号，请先访问 https://dash.cloudflare.com/sign-up 注册（免费）

### 第三步：创建 KV Namespace

KV Namespace 是 Cloudflare 提供的全球分布式键值存储，用于保存你的壁纸数据。

```bash
# 进入项目目录
cd /Users/mac137/wallpaper-gallery

# 创建 KV namespace（生产环境）
wrangler kv:namespace create WALLPAPER_KV
```

**重要：** 复制输出中的 `id`，例如：
```
⛅️ wrangler 3.0.0
-------------------
🌀  Creating namespace with title "wallpaper-api-WALLPAPER_KV"
✨  Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "WALLPAPER_KV", id = "abc123def456ghi789" }
```

### 第四步：配置 wrangler.toml

打开 `wrangler.toml` 文件，将刚才获得的 KV namespace ID 填入：

```toml
name = "wallpaper-api"
main = "workers/api.js"
compatibility_date = "2024-01-01"

# KV Namespace 绑定
[[kv_namespaces]]
binding = "WALLPAPER_KV"
id = "abc123def456ghi789"  # ← 替换为你的实际 ID

# 环境配置
[env.production]
name = "wallpaper-api-prod"
```

### 第五步：部署 Workers

```bash
# 部署到 Cloudflare Workers
wrangler deploy

# 或使用生产环境配置
wrangler deploy --env production
```

**成功后会显示：**
```
⛅️ wrangler 3.0.0
-------------------
Total Upload: xx.xx KiB / gzip: xx.xx KiB
Uploaded wallpaper-api (x.xx sec)
Published wallpaper-api (x.xx sec)
  https://wallpaper-api.YOUR-SUBDOMAIN.workers.dev
Current Deployment ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

**复制你的 Worker URL**，例如：`https://wallpaper-api.YOUR-SUBDOMAIN.workers.dev`

### 第六步：更新前端 API 地址

打开 `cloudflare-sync.js` 文件，将 Worker URL 更新为你的实际地址：

```javascript
// API 配置（部署后需要更新为实际的 Worker URL）
this.apiUrl = 'https://wallpaper-api.YOUR-SUBDOMAIN.workers.dev/api/wallpapers';
```

**替换为：**
```javascript
// API 配置
this.apiUrl = 'https://wallpaper-api.abc123.workers.dev/api/wallpapers';  // 你的实际 URL
```

### 第七步：提交并部署前端

```bash
# 提交更改
git add .
git commit -m "启用 Cloudflare Workers 云端同步"

# 推送到 GitHub
git push

# Cloudflare Pages 会自动部署
```

---

## 🎉 完成！测试云端同步

### 1. 在电脑上测试

1. 访问你的壁纸库网站
2. 上传几张壁纸
3. 点击 **"☁️ 同步到云端"**
4. 看到提示 **"✅ 同步成功！已上传 X 张壁纸到云端"**

### 2. 在手机上测试

1. 打开手机浏览器，访问同一个网站
2. 网页加载后会自动提示：**"☁️ 检测到云端有更新！是否立即下载？"**
3. 点击 **"确定"**
4. 等待自动下载完成
5. 查看壁纸，应该与电脑上的一致！

### 3. 双向同步测试

1. 在手机上上传新壁纸
2. 点击 **"☁️ 同步到云端"**
3. 回到电脑，刷新页面
4. 自动提示有更新，点击下载
5. 完美同步！ 🎊

---

## 📊 Cloudflare Workers 免费额度

| 项目 | 免费额度 | 足够使用吗？ |
|------|----------|--------------|
| **请求次数** | 100,000 次/天 | ✅ 绰绰有余 |
| **CPU 时间** | 10ms/请求 | ✅ 足够 |
| **KV 读取** | 100,000 次/天 | ✅ 足够 |
| **KV 写入** | 1,000 次/天 | ✅ 足够个人使用 |
| **KV 存储** | 1 GB | ✅ 可存储数千张壁纸 |

> **个人使用估算**：每天上传 10 张壁纸，下载 5 次，完全免费！

---

## ⚙️ 高级配置（可选）

### 自定义域名

如果你有自己的域名，可以绑定到 Worker：

```bash
# 添加自定义域名（需要域名托管在 Cloudflare）
wrangler publish
# 然后在 Cloudflare Dashboard 中配置自定义域名
```

### 查看 KV 数据

```bash
# 列出所有 KV keys
wrangler kv:key list --namespace-id=你的KV_ID

# 查看具体数据
wrangler kv:key get "wallpapers" --namespace-id=你的KV_ID
```

### 查看实时日志

```bash
# 查看 Worker 运行日志
wrangler tail
```

---

## 🔧 故障排查

### 问题 1：部署失败

**错误**: `Error: Failed to publish your worker`

**解决**:
```bash
# 重新登录
wrangler logout
wrangler login

# 重新部署
wrangler deploy
```

### 问题 2：提示"云端数据无效"

**原因**: Worker URL 配置错误或未部署成功

**解决**:
1. 确认 `cloudflare-sync.js` 中的 `apiUrl` 是否正确
2. 浏览器访问 `https://你的worker地址/api/wallpapers`，应该返回 JSON 数据
3. 检查浏览器控制台是否有 CORS 错误

### 问题 3：无法连接到服务器

**原因**: 网络问题或 Worker 未启动

**解决**:
```bash
# 检查 Worker 状态
wrangler deployments list

# 重新部署
wrangler deploy
```

### 问题 4：提示"网络超时"

**原因**: 上传的壁纸太大或网络不稳定

**解决**:
1. 压缩图片/视频后再上传
2. 增加超时时间（在 `cloudflare-sync.js` 中修改 `timeout` 参数）
3. 分批上传，不要一次上传太多

---

## 📱 使用技巧

### 多设备同步流程

**首次使用（在主设备上）**:
1. 上传所有壁纸
2. 点击 **"☁️ 同步到云端"**
3. 等待上传完成

**在其他设备上**:
1. 打开网站
2. 自动提示有云端更新
3. 点击下载
4. 完成！

**日常使用**:
- 任何设备上传新壁纸后，点击 **"☁️ 同步到云端"**
- 其他设备刷新页面会自动提示更新
- 点击 **"📥 从云端下载"** 即可同步

### 最佳实践

1. **定期同步**: 每次上传新壁纸后，记得点击"同步到云端"
2. **避免冲突**: 不要在多个设备同时上传和修改
3. **备份数据**: 定期使用"📤 导出数据"功能备份到本地
4. **存储管理**: 当接近 1GB 限制时，删除一些不常用的壁纸

---

## 🎊 完成！

现在你已经拥有一个**完全零配置、多设备自动同步**的在线壁纸库了！

- ✅ 打开网页自动检测更新
- ✅ 电脑、手机、平板无缝同步
- ✅ 无需任何 Token 或配置
- ✅ 完全免费使用

就像一个真正的在线相册！📸✨

---

## 📚 相关文档

- [Cloudflare Workers 官方文档](https://developers.cloudflare.com/workers/)
- [Cloudflare KV 文档](https://developers.cloudflare.com/workers/runtime-apis/kv/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)

如有问题，请查看 [GitHub Issues](https://github.com/你的仓库/issues)
