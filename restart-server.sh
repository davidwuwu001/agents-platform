#!/bin/bash

# 查找当前运行的HTTP服务器进程
PID=$(lsof -i:8080 -t)

# 如果找到进程，则关闭它
if [ ! -z "$PID" ]; then
  echo "关闭当前HTTP服务器（PID: $PID）..."
  kill $PID
  sleep 1
fi

# 启动新的HTTP服务器
echo "启动新的HTTP服务器在端口8080..."
python -m http.server 8080 