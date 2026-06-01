#!/bin/bash
# ECHO 模拟器后端启动脚本
# 用法: bash start.sh

echo "🌱 启动 ECHO 模拟器后端 v4.0..."
echo "================================"

# 检查 Python
echo "检查 Python..."
python3 --version || python --version || {
    echo "❌ 未找到 Python3，请先安装 Python 3.8+"
    exit 1
}

# 检查依赖
echo "检查依赖..."
pip3 install -q -r requirements.txt 2>/dev/null || pip install -q -r requirements.txt 2>/dev/null || {
    echo "⚠️  正在安装依赖（首次需要几分钟）..."
    pip3 install -r requirements.txt || pip install -r requirements.txt
}

echo "✅ 依赖就绪"

# 启动后端
echo ""
echo "🚀 启动后端服务..."
echo "   地址: http://0.0.0.0:8000"
echo "   文档: http://localhost:8000/docs"
echo "   按 Ctrl+C 停止"
echo ""

python3 echo_simulator_api_v2.py
