#!/bin/bash
# B777 一键部署脚本 - 自动同步版本号并推送两个仓库
# 用法: ./deploy.sh "提交说明"

set -e
cd "$(dirname "$0")"

MSG="${1:-update}"
# Token must be provided via GH_TOK environment variable:
#   export GH_TOK=your_github_pat
#   ./deploy.sh "your message"
TOK="${GH_TOK:?请先设置环境变量 GH_TOK=你的GitHub令牌}"

# 读取当前版本号并 +1
CUR=$(grep -oE "b777-v[0-9]+" sw.js | sed 's|b777-v||')
NEW=$((CUR + 1))
echo "版本 v$CUR → v$NEW"

# 同步三处版本号
sed -i "s/b777-v$CUR/b777-v$NEW/" sw.js
echo "{\"version\":\"$NEW\"}" > version.json
sed -i "s/var APP_VERSION = '[0-9]*';/var APP_VERSION = '$NEW';/" index.html

# 语法检查
node -e "const h=require('fs').readFileSync('index.html','utf8');const m=h.match(/<script>([\s\S]*?)<\/script>/g);m.forEach(s=>{new Function(s.replace(/<\/?script>/g,''))});console.log('✅ JS OK');"

# 提交推送两个仓库
git add -A
git -c user.email="jack@ghostchat.app" -c user.name="Jack" commit -m "$MSG;版本v$NEW" | tail -1
git push https://chunhua1780:$TOK@github.com/chunhua1780/B777.git main 2>&1 | tail -1
git push --force https://chunhua1780:$TOK@github.com/chunhua1780/ek.git main:main 2>&1 | tail -1
echo "✅ 已部署 v$NEW 到两个仓库"
