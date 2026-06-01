# ECHO 模拟器 · 前后端连接测试指南

## 1. 启动后端（Terminal 1）

```bash
cd /root/.openclaw/workspace/echo-v2/simulation
python3 echo_simulator_api.py
```

看到类似输出即成功：
```
INFO:     Started server process [xxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**保持这个窗口运行**，不要关掉。

---

## 2. 打开前端

**方式 A（推荐）**：直接浏览器打开文件
```
文件路径：/root/.openclaw/workspace/echo-v2/simulation/visualization_mesa.html
```
右键 → 用浏览器打开

**方式 B**：本地 HTTP 服务器（如果需要跨域严格环境）
```bash
cd /root/.openclaw/workspace/echo-v2/simulation
python3 -m http.server 8080
# 然后访问 http://localhost:8080/visualization_mesa.html
```

---

## 3. 验证连接

打开页面后你应该看到：
- ✅ 右上角 Toast 弹出：`后端引擎已连接`
- 或 ⚠️ `后端未就绪，将使用本地引擎`

如果看到 ✅，说明前后端连通。

---

## 4. 测试三个按钮

| 按钮 | 预期行为 | 验证方法 |
|:---|:---|:---|
| **▶ 运行模拟** | 显示 loading → 几秒后出结果 | F12 Network 面板看到 `POST /run` |
| **🏆 锦标赛** | 显示 loading → 出策略对比表 | Network 面板看到 `POST /run/tournament` |
| **🔬 A/B实验** | 显示 loading → 出 ECHO vs 对照组 | Network 面板看到 `POST /run/ab` |

**Loading 效果**：全局遮罩 + 旋转动画 + 进度条（模拟进度，因为后端没推实时进度）

---

## 5. 常见问题

### 问题：Toast 显示「后端未就绪」
**原因**：后端没启动，或端口被占
**解决**：
```bash
# 检查 8000 端口是否被占
lsof -i :8000
# 如果被占，杀掉进程或改端口（需改前端代码里的 API_BASE）
```

### 问题：点了按钮一直 loading 卡住
**原因**：后端计算太慢或超时
**解决**：等 30-60 秒会自动降级到本地引擎，或刷新页面重试

### 问题：Network 面板看不到请求
**原因**：前端直接用了本地 JS 引擎（backendAvailable = false）
**解决**：确认后端已启动，刷新页面重新检测

### 问题：后端启动报错（ModuleNotFoundError）
**原因**：缺少依赖
**解决**：
```bash
pip3 install fastapi uvicorn pydantic
```

---

## 6. 后端 API 快速验证

```bash
# 测试健康检查
curl http://localhost:8000/health

# 测试单次模拟
curl -X POST http://localhost:8000/run \
  -H "Content-Type: application/json" \
  -d '{"n_creators":3,"n_users":5,"duration_days":7}'
```

如果 curl 能通但前端不通 → 可能是浏览器 CORS 问题，用方式 B（python http.server）解决。

---

## 7. 如果暂时不想启动后端

前端已保留**本地 JS 引擎 fallback**：
- 后端不可用时自动切换
- 所有功能照样能用（只是数据是前端生成的）
- 适合快速查看 UI/调试

---

**文件位置汇总**：
- 后端：`/root/.openclaw/workspace/echo-v2/simulation/echo_simulator_api.py`
- 前端：`/root/.openclaw/workspace/echo-v2/simulation/visualization_mesa.html`
