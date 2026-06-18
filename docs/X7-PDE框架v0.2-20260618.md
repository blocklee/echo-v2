# X7 PDE 滑动窗口框架 v0.2
**更新日期：** 2026-06-18
**命名更新：** alpha → beta（tanh 陡度系数），按哪吒拍板统一命名

---

## 一、核心方程

基于 Euler 离散化的 PDE 滑动窗口模型：

```
Φ_{t+1} = Φ_t + Δt · [D · ∇²Φ_t - γ · Φ_t + S_t]
```

其中：
- **Φ** = 势位（potential）
- **D** = 扩散系数（diffusivity）
- **γ** = 衰减率（decay rate）
- **S** = 源项（source term）
- **∇²** = 图拉普拉斯算子（graph Laplacian）

---

## 二、时间离散化（Euler 前向）

```python
def compute_next_phi(phi, D, gamma, S, L, dt=1.0):
    # ∇²Φ ≈ L @ phi  （L 是归一化图拉普拉斯）
    diffusion = D * (L @ phi)
    decay = gamma * phi
    source = S
    return phi + dt * (diffusion - decay + source)
```

---

## 三、k(Φ) 动态系数

**旧命名（作废）：** alpha（与猫先森的 Pareto 形状参数冲突）
**新命名：** beta（tanh 陡度系数）

```python
def k_phi(phi, beta=1.0, phi_min=0.0, phi_max=1.0):
    """动态扩散系数，beta 控制陡度"""
    normalized = (phi - phi_min) / (phi_max - phi_min + 1e-8)
    # beta 越大，k(Φ) 随 Φ 变化越陡峭
    return 1.2 + 0.3 * np.tanh(beta * (normalized - 0.5))
```

**参数说明：**
- beta = 1.0（默认）
- 范围：[1.2, 1.5]（低势位慢扩散，高势位快扩散）
- **物理意义：** 高势位节点获得更强传播力

---

## 四、源项 S 格式（对接 Seaman_bot v0.1）

**S_base 公式（采用 Seaman_bot v0.1 定义）：**
```
S_base = ξ / 5.0
```

| ξ 档位 | S_base | 含义 |
|--------|--------|------|
| ξ=4 | S_base=0.8 | 飞龙主脉 |
| ξ=2 | S_base=0.4 | 惕龙旁支 |

**注：** X7 早期版本曾提出四权组合公式（S_base = α₁・S_ν + α₂・S_ξ + ...），经 review 发现与 Seaman_bot v0.1 冲突。已统一采用 ξ/5.0 映射规范。

---

## 五、滑动窗口计算

```python
def sliding_window_phi(phi_history, window_size=7):
    """
    滑动窗口平均：平滑势位历史
    window_size = 7 表示近 7 个周期的移动平均
    """
    if len(phi_history) < window_size:
        return np.mean(phi_history, axis=0)
    return np.mean(phi_history[-window_size:], axis=0)
```

---

## 六、完整迭代流程

```python
def pde_iteration(phi, L, xi, beta=1.0, D=0.1, gamma=0.05,
                  window_size=7, dt=1.0):
    # 1. 计算源项 S_base = xi / 5.0
    S_base = xi / 5.0
    
    # 2. 计算动态 k(Φ)
    k = k_phi(phi, beta=beta)
    
    # 3. PDE 一步迭代
    phi_next = compute_next_phi(phi, D*k, gamma, S_base, L, dt)
    
    # 4. 滑动窗口平滑
    return sliding_window_phi([phi, phi_next], window_size)
```

---

## 七、参数对照表

| 参数 | 旧命名 | 新命名 | 说明 |
|------|--------|--------|------|
| tanh 陡度系数 | alpha | **beta** | k(Φ) 动态系数，控制扩散陡度 |
| Pareto 形状参数 | alpha | **alpha**（保留） | 猫先森的参数，**不冲突** |
| 源项基准 | S_base | S_base | = ξ/5.0 |

---

## 八、与 Seaman_bot 接口对接

- **输入：** ξ（档位，0-5）
- **输出：** S_base = ξ/5.0
- **k(Φ) 临时常量：** 1.0（等 v0.5.2 落盘后更新）

---

## 九、状态标记

- **v0.1（作废）：** alpha 命名冲突，S_base 公式未统一
- **v0.2（当前）：** beta 统一命名，S_base = ξ/5.0 对接 Seaman_bot v0.1
