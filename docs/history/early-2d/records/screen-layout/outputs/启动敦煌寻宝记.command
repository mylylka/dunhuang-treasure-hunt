#!/bin/zsh
set -e
TASK_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if command -v node >/dev/null 2>&1; then
  TASK_NODE="$(command -v node)"
elif [[ -x /Users/liujing/.local/bin/node ]]; then
  TASK_NODE=/Users/liujing/.local/bin/node
else
  print "没有找到 Node.js，请联系开发 Agent。"
  read "?按回车关闭。"
  exit 1
fi
exec "$TASK_NODE" "$TASK_ROOT/scripts/serve-preview.mjs"
