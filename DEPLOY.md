# 🚀 一键部署指南

## 方法 1: Vercel 部署（推荐）

### 步骤 1: 安装 Vercel CLI
```bash
npm install -g vercel
```

### 步骤 2: 登录并部署
```bash
cd /Users/mac137/wallpaper-gallery
vercel
```

按照提示操作：
1. 首次使用会要求登录（支持 GitHub/GitLab/Email）
2. 选择项目设置（默认即可）
3. 等待部署完成
4. 获得线上地址，例如：`https://wallpaper-gallery-xxx.vercel.app`

### 步骤 3: 后续更新
```bash
# 修改文件后重新部署
vercel --prod
```

---

## 方法 2: Netlify 拖拽部署

1. 访问 https://app.netlify.com/drop
2. 将整个 `wallpaper-gallery` 文件夹拖拽到页面
3. 等待部署完成（约30秒）
4. 获得线上地址，例如：`https://random-name-123.netlify.app`

---

## 方法 3: GitHub Pages

### 步骤 1: 创建 GitHub 仓库
访问 https://github.com/new 创建新仓库

### 步骤 2: 上传代码
```bash
cd /Users/mac137/wallpaper-gallery

git init
git add .
git commit -m "Initial commit: 我的壁纸库"
git branch -M main
git remote add origin https://github.com/你的用户名/wallpaper-gallery.git
git push -u origin main
```

### 步骤 3: 启用 GitHub Pages
1. 进入仓库 Settings → Pages
2. Source 选择 `main` 分支
3. 点击 Save
4. 等待部署（约1分钟）
5. 访问 `https://你的用户名.github.io/wallpaper-gallery`

---

## 🌐 部署后测试清单

- [ ] 打开线上地址
- [ ] 测试上传图片
- [ ] 测试上传视频
- [ ] 测试全屏查看
- [ ] 测试键盘切换（← →）
- [ ] 测试 ESC 退出
- [ ] 测试删除功能
- [ ] 刷新页面，确认数据保存
- [ ] 移动端测试（触摸滑动）

---

## 💡 自定义域名（可选）

### Vercel
1. 在 Vercel 项目设置中
2. Domains → Add Domain
3. 输入你的域名
4. 按提示配置 DNS

### Netlify
1. 在 Netlify 项目设置中
2. Domain management → Add custom domain
3. 按提示配置 DNS

### GitHub Pages
1. 在仓库根目录创建 `CNAME` 文件
2. 写入你的域名（如 `wallpaper.example.com`）
3. 在域名 DNS 设置中添加 CNAME 记录

---

## 🔒 注意事项

1. **隐私性**：数据存储在用户本地，不会上传到服务器
2. **跨设备**：不同设备/浏览器的数据独立存储
3. **备份建议**：定期导出重要壁纸（可用开发者工具查看 LocalStorage）
4. **浏览器限制**：清除浏览器数据会删除所有壁纸

---

**部署完成后，分享链接给朋友即可！** 🎉
