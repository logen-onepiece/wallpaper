# Vercel 部署指南

## ✅ 为什么选择 Vercel？

1. **免费套餐完全够用**
   - Edge Functions（无限制）
   - Vercel KV：256MB 存储 + 100K 次读取/月
   - **不需要绑定银行卡**

2. **国内可直接访问**
   - 无需 VPN
   - 自动 CDN 加速

3. **零配置**
   - 自动识别项目
   - 一键部署

---

## 📦 部署步骤

### 1. 创建 Vercel KV 数据库

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 **Storage** 标签
3. 点击 **Create Database**
4. 选择 **KV (Key-Value Store)**
5. 输入数据库名称：`wallpaper-kv`
6. 点击 **Create**

### 2. 部署项目

#### 方法 A：通过 Vercel Dashboard（推荐）

1. 访问 [Vercel Dashboard](https://vercel.com/new)
2. 点击 **Import Project**
3. 选择你的 GitHub 仓库
4. Vercel 会自动识别配置
5. 点击 **Deploy**

#### 方法 B：通过 CLI

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署
cd /Users/mac137/wallpaper-gallery
vercel

# 4. 第一次部署时按提示操作：
# - Set up and deploy? Yes
# - Which scope? 选择你的账户
# - Link to existing project? No
# - What's your project's name? wallpaper-gallery
# - In which directory is your code located? ./
# - Want to override the settings? No
```

### 3. 连接 KV 数据库到项目

1. 在 Vercel Dashboard 中打开你的项目
2. 进入 **Storage** 标签
3. 点击 **Connect Store**
4. 选择刚才创建的 `wallpaper-kv`
5. 点击 **Connect**

Vercel 会自动注入以下环境变量：
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`

### 4. 验证部署

1. 访问你的 Vercel 部署域名（例如：`https://wallpaper-gallery.vercel.app`）
2. 打开浏览器控制台（F12）
3. 上传一张测试图片
4. 刷新页面，确认图片依然存在
5. 在另一台设备上访问相同域名，确认看到相同的图片

---

## 🔧 本地开发（可选）

如果需要本地测试 Vercel Edge Functions：

```bash
# 1. 安装依赖
npm install @vercel/kv

# 2. 从 Vercel Dashboard 获取 KV 环境变量
# Project Settings > Storage > wallpaper-kv > .env.local 标签

# 3. 复制环境变量到 .env.local 文件

# 4. 启动本地开发服务器
vercel dev
```

---

## 📱 测试清单

- [ ] 电脑端上传图片
- [ ] 电脑端刷新页面，图片依然存在
- [ ] 手机端访问，看到电脑上传的图片
- [ ] 手机端上传图片
- [ ] 电脑端刷新，看到手机上传的图片
- [ ] 删除图片，两端都同步
- [ ] 切换显示模式（contain/cover），两端都同步

---

## ⚠️ 注意事项

1. **免费额度限制**
   - KV 存储：256MB
   - 读取次数：100K/月
   - 超出后会收费，但对于个人使用完全够用

2. **图片大小建议**
   - 单张图片建议 < 10MB
   - 视频建议 < 50MB
   - 如果需要存储更多，可以考虑使用 Vercel Blob 或 Cloudflare R2

3. **数据备份**
   - 定期使用"导出数据"功能备份
   - Vercel KV 数据是持久化的，但建议养成备份习惯

---

## 🚀 部署完成后

部署成功后，你会得到一个类似这样的域名：
```
https://wallpaper-gallery.vercel.app
```

或者你可以绑定自己的域名：
1. 在 Vercel Dashboard 中打开项目
2. 进入 **Settings** > **Domains**
3. 添加你的域名
4. 按照提示配置 DNS

---

## ❓ 常见问题

**Q: 需要绑定银行卡吗？**
A: 不需要！Vercel 免费套餐足够使用。

**Q: 国内访问速度如何？**
A: Vercel 在国内可以访问，速度取决于你的网络。通常比 Cloudflare Workers 更稳定。

**Q: 如果超出免费额度怎么办？**
A: Vercel 会提示你升级，但对于个人壁纸收藏，100K 次读取/月远远够用。

**Q: 数据会丢失吗？**
A: Vercel KV 是持久化存储，不会丢失。但建议定期导出备份。

---

## 📞 需要帮助？

如果遇到问题，请检查：
1. 浏览器控制台（F12）的错误信息
2. Vercel Dashboard 的 Logs 标签
3. 确认 KV 数据库已正确连接到项目
