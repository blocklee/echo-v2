"""
ECHO PDE 物理演化 - β*Φ³ 非线性饱和实现

哪吒的设计意图：
dPhi/dt = D·L·Φ - γ·Φ + S - β·Φ³

其中：
- D·L·Φ：图传播（拉普拉斯算子）
- -γ·Φ：线性衰减
- S：源项（事件驱动）
- -β·Φ³：非线性饱和（β*Φ³）
"""

import random
import math
from collections import defaultdict

def gini_coefficient(values):
    n = len(values)
    if n == 0:
        return 0.0
    sv = sorted(values)
    diff = sum(abs(a - b) for a, b in zip(sv, sv[1:]))
    mean = sum(values) / n
    if mean == 0:
        return 0.0
    return diff / (2 * n * mean)

def matthew_coefficient(values, top_percent=0.1):
    n = len(values)
    if n == 0:
        return 1.0
    sorted_vals = sorted(values, reverse=True)
    top_n = max(1, int(n * top_percent))
    top_avg = sum(sorted_vals[:top_n]) / top_n
    overall_avg = sum(values) / n
    return top_avg / overall_avg if overall_avg > 0 else 1.0


class PDECubicBetaSimulator:
    """PDE 物理演化 - β*Φ³ 非线性饱和"""
    
    def __init__(self, beta=0.05, gamma=0.2, n=100, steps=3000, seed=42):
        self.beta = beta
        self.gamma = gamma
        self.n = n
        self.steps = steps
        self.seed = seed
        random.seed(seed)
        
        # 势位场（单一标量）
        self.phi = {f"n{i}": 1.0 + random.uniform(-0.1, 0.1) for i in range(n)}
        
        # 图结构
        self.edges_out = defaultdict(list)
        self.edges_in = defaultdict(list)
        
        self.history = []
        
    def _calc_gamma_dynamic(self, node_id):
        """动态 γ：只出不进 → 高衰减"""
        out_deg = len(self.edges_out.get(node_id, []))
        in_deg = len(self.edges_in.get(node_id, []))
        out_ratio = out_deg / max(1, in_deg)
        return self.gamma * (1 + 0.5 * out_ratio)
    
    def _select_target_by_phi(self, source):
        """基于 Φ 的 PA 偏好选择目标"""
        candidates = [n for n in self.phi if n != source]
        if not candidates:
            return source
        weights = [self.phi[n] ** 0.5 for n in candidates]
        total = sum(weights)
        if total <= 0:
            return random.choice(candidates)
        r = random.random() * total
        cum = 0
        for n, w in zip(candidates, weights):
            cum += w
            if cum >= r:
                return n
        return candidates[-1]
    
    def _graph_propagation(self, s, t):
        """
        图传播：D·L·Φ
        基于 PA 偏好的势位传播
        """
        gain = 5.0  # K=1 的增益
        
        # 目标节点获得图传播增益
        phi_t = self.phi[t]
        gamma_t = self._calc_gamma_dynamic(t)
        
        # 标准更新：Φ = Φ + gain - γ·Φ
        self.phi[t] = phi_t + gain - gamma_t * phi_t
        self.phi[t] = max(0.001, self.phi[t])
        
        # 源节点获得活跃奖励
        self.phi[s] = self.phi.get(s, 1.0) + gain * 0.01
        
        # 边记录
        self.edges_out[s].append(t)
        self.edges_in[t].append(s)
    
    def _source_term(self, node):
        """
        源项：S
        事件驱动的势位增量
        """
        source = 1.0  # 事件源项强度
        gain = 5.0   # 事件增益
        
        phi_t = self.phi[node]
        gamma_t = self._calc_gamma_dynamic(node)
        
        # 标准更新：Φ = Φ + source - γ·Φ
        self.phi[node] = phi_t + gain + source - gamma_t * phi_t
        self.phi[node] = max(0.001, self.phi[node])
    
    def _beta_cubic_saturation(self, node):
        """
        β·Φ³ 非线性饱和
        设计意图：dPhi/dt = ... - β·Φ³
        """
        phi = self.phi[node]
        
        # 非线性饱和项：-β·Φ³
        cubic_term = self.beta * phi ** 3
        
        # 从势位中减去饱和项
        self.phi[node] = phi - cubic_term
        self.phi[node] = max(0.001, self.phi[node])
    
    def step(self):
        """单步物理演化"""
        # 1. 图传播
        s = random.choice(list(self.phi.keys()))
        t = self._select_target_by_phi(s)
        self._graph_propagation(s, t)
        
        # 2. 事件驱动（10% 概率）
        if random.random() < 0.1:
            node = random.choice(list(self.phi.keys()))
            self._source_term(node)
        
        # 3. β·Φ³ 非线性饱和
        for node in self.phi.keys():
            self._beta_cubic_saturation(node)
    
    def run(self):
        """运行物理演化"""
        for step in range(self.steps):
            self.step()
            
            if step % 100 == 0 or step == self.steps - 1:
                phi_vals = list(self.phi.values())
                
                self.history.append({
                    "step": step + 1,
                    "phi_max": max(phi_vals),
                    "phi_avg": sum(phi_vals) / len(phi_vals),
                    "gini": gini_coefficient(phi_vals),
                    "matthew": matthew_coefficient(phi_vals),
                })
        
        return self.history


def run_beta_comparison():
    """对比不同 β 值"""
    print("=" * 70)
    print("ECHO PDE β*Φ³ 非线性饱和实验")
    print("=" * 70)
    
    n, steps = 100, 3000
    gamma = 0.2
    
    beta_values = [0.0, 0.01, 0.05, 0.10]
    results = {}
    
    for beta in beta_values:
        print(f"\n=== β={beta} ===")
        
        beta_results = []
        for seed in [42, 123, 456, 789, 1000]:
            sim = PDECubicBetaSimulator(beta=beta, gamma=gamma, n=n, steps=steps, seed=seed)
            history = sim.run()
            last = history[-1]
            beta_results.append(last)
            print(f"  seed={seed}: phi_max={last['phi_max']:.2f}, gini={last['gini']:.4f}")
        
        # 计算平均值
        avg_phi_max = sum(r['phi_max'] for r in beta_results) / len(beta_results)
        avg_gini = sum(r['gini'] for r in beta_results) / len(beta_results)
        avg_matthew = sum(r['matthew'] for r in beta_results) / len(beta_results)
        
        results[beta] = {
            "avg_phi_max": avg_phi_max,
            "avg_gini": avg_gini,
            "avg_matthew": avg_matthew,
        }
        
        print(f"  平均: phi_max={avg_phi_max:.2f}, gini={avg_gini:.4f}, matthew={avg_matthew:.2f}")
    
    # 汇总对比
    print("\n" + "=" * 70)
    print("汇总对比")
    print("=" * 70)
    print(f"{'β':<8} {'phi_max':<12} {'gini':<10} {'matthew':<10}")
    print("-" * 70)
    for beta in beta_values:
        r = results[beta]
        print(f"{beta:<8} {r['avg_phi_max']:<12.2f} {r['avg_gini']:<10.4f} {r['avg_matthew']:<10.2f}")
    
    # 分析结论
    print("\n" + "=" * 70)
    print("分析结论")
    print("=" * 70)
    
    beta_0 = results[0.0]
    beta_005 = results[0.05]
    
    print(f"β=0 → β=0.05 的变化：")
    print(f"  phi_max: {beta_0['avg_phi_max']:.2f} → {beta_005['avg_phi_max']:.2f} ({(beta_005['avg_phi_max']/beta_0['avg_phi_max']-1)*100:+.1f}%)")
    print(f"  gini: {beta_0['avg_gini']:.4f} → {beta_005['avg_gini']:.4f}")
    print(f"  matthew: {beta_0['avg_matthew']:.2f} → {beta_005['avg_matthew']:.2f}")
    
    print("\nβ*Φ³ 非线性饱和的效果：")
    if beta_005['avg_phi_max'] < beta_0['avg_phi_max']:
        print("✅ 饱和有效：phi_max 降低")
    else:
        print("❌ 饱和无效：phi_max 未降低")
    
    return results


if __name__ == "__main__":
    run_beta_comparison()