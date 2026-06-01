#!/bin/bash
# ECHO Simulator API 启动脚本
cd /root/.openclaw/workspace/echo-v2/simulation
python3 echo_simulator_api.py > api.log 2>&1 &
echo "API started on http://localhost:8000"
echo "PID: $!"
sleep 2
curl -s http://localhost:8000/health
echo ""
