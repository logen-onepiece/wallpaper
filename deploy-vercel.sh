#!/bin/bash

# Vercel 快速部署脚本

echo "🚀 开始部署壁纸收藏到 Vercel..."
echo ""

# 检查是否已登录 Vercel
if ! command -v vercel &> /dev/null; then
    echo "📦 正在安装 Vercel CLI..."
    npm install -g vercel
fi

# 登录 Vercel
echo "🔐 请先登录 Vercel..."
vercel login

# 部署
echo ""
echo "🌐 开始部署..."
vercel --prod

echo ""
echo "✅ 部署完成！"
echo ""
echo "📝 下一步："
echo "1. 访问 https://vercel.com/dashboard"
echo "2. 打开你的项目"
echo "3. 进入 Storage 标签"
echo "4. 创建 KV 数据库（名称：wallpaper-kv）"
echo "5. 连接 KV 数据库到项目"
echo "6. 访问你的部署域名测试"
echo ""
