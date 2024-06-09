#!/bin/bash

# 确保脚本在出错时停止
set -e

# 构建项目（假设你使用的是 npm）
bun run build

# 进入构建输出目录
cd dist

# 初始化一个新的 Git 仓库
git init
git add -A
git commit -m 'deploy'

# 将构建产物推送到 gh-pages 分支
# 替换 <USERNAME>/<REPO> 为你的 GitHub 用户名和仓库名
git push -f git@github.com:piex/TSWebStudio.git main:gh-pages
rm -rf .git

cd -
rm -rf dist