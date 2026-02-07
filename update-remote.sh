#!/bin/bash

echo "🔄 更新 Git 远程仓库地址..."

# 移除旧的远程地址
git remote remove origin

# 添加新的组织仓库地址
git remote add origin https://github.com/logen-onepiece/wallpaper.git

# 验证配置
echo ""
echo "✅ 远程仓库已更新为："
git remote -v

echo ""
echo "📝 下次推送时使用："
echo "git push -u origin main"

