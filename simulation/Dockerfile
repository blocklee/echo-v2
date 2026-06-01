FROM python:3.11-slim

WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制代码
COPY echo_contract_mock.py .
COPY echo_simulation_mesa_v2.py .
COPY echo_simulator_api_v2.py .

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["python3", "echo_simulator_api_v2.py"]
