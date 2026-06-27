"""
ECHO 耦合框架对比实验：min() vs tanh()
E0-E6 实验设计

目标：对比两种耦合形式的数据表现
- min()：X7 方案
- tanh()：云子方案
"""

import random
import math
from collections import defaultdict

def gini_coefficient(values):
    """计算 Gini 系数"""
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
    """计算马太效应：top 10% 占比 vs 平均"""
    n = len(values)
    if n == 0:
        return 1.0
    sorted_vals = sorted(values, reverse=True)
    top_n = max(1, int(n * top_percent))
    top_avg = sum(sorted_vals[:top_n]) / top_n
    overall_avg = sum(values) / n
    return top_avg / overall_avg if overall_avg > 0 else 1.0

class MinCouplingSimulator:
    """min() 耦合模拟器（X7 方案）"""
    
    def __init__(self, k=0.05, gamma=0.2, n=100, steps=3000, seed=42):
        self.k = k
        self.gamma = gamma
        self.n = n
        self.steps = steps
        self.seed = seed
        random.seed(seed)
        
        self.phi_g = {f"n{i}": 1.0 + random.uniform(-0.1, 0.1) for i in range(n)}
        self.phi_e = {f"n{i}": 1.0 + random.uniform(-0.1, 0.1) for i in range(n)}
        
        self.edges_out = defaultdict(list)
        self.edges_in = defaultdict(list)
        
        self.history = []
        
    def _calc_gamma_dynamic(self, node_id):
        """动态 γ"""
        out_deg = len(self.edges_out.get(node_id, []))
        in_deg = len(self.edges_in.get(node_id, []))
        out_ratio = out_deg / max(1, in_deg)
        return self.gamma * (1 + 0.5 * out_ratio)
    
    def _select_target_by_phi_g(self, source):
        """基于 Φ_g 的 PA 偏好"""
        candidates = [n for n in self.phi_g if n != source]
        if not candidates:
            return source
        weights = [self.phi_g[n] ** 0.5 for n in candidates]
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
    
    def _propagate(self, s, t):
        """图传播 + min() 耦合"""
        gain = 5.0
        
        phi_g_t = self.phi_g[t]
        phi_e_t = self.phi_e[t]
        
        # min() 耦合项
        cross = self.k * min(phi_g_t, phi_e_t)
        
        # Φ_g 更新
        gamma_g = self._calc_gamma_dynamic(t)
        self.phi_g[t] = phi_g_t + gain - gamma_g * phi_g_t
        self.phi_g[t] = max(0.001, self.phi_g[t])
        
        # Φ_e 更新（事件驱动）
        self.phi_e[t] = phi_e_t * (1 - self.gamma)
        self.phi_e[t] = max(0.001, self.phi_e[t])
        
        # 源节点奖励
        self.phi_g[s] = self.phi_g[s] + gain * 0.01
        
        # 边记录
        self.edges_out[s].append(t)
        self.edges_in[t].append(s)
    
    def _event(self, node):
        """事件驱动"""
        gain = 0.5
        phi_g_t = self.phi_g[node]
        phi_e_t = self.phi_e[node]
        
        cross = self.k * min(phi_g_t, phi_e_t)
        self.phi_e[node] = phi_e_t + gain + cross
        self.phi_e[node] = max(0.001, self.phi_e[node])
        
        self.phi_g[node] = phi_g_t * (1 - self.gamma)
        self.phi_g[node] = max(0.001, self.phi_g[node])
    
    def run(self):
        """运行模拟"""
        for step in range(self.steps):
            s = random.choice(list(self.phi_g.keys()))
            t = self._select_target_by_phi_g(s)
            self._propagate(s, t)
            
            if random.random() < 0.1:
                node = random.choice(list(self.phi_e.keys()))
                self._event(node)
            
            if step % 100 == 0 or step == self.steps - 1:
                phi_g_vals = list(self.phi_g.values())
                phi_e_vals = list(self.phi_e.values())
                phi_total = [phi_g_vals[i] + phi_e_vals[i] + 
                            self.k * min(phi_g_vals[i], phi_e_vals[i]) 
                            for i in range(self.n)]
                
                self.history.append({
                    "step": step + 1,
                    "phi_g_max": max(phi_g_vals),
                    "phi_e_max": max(phi_e_vals),
                    "phi_g_avg": sum(phi_g_vals) / len(phi_g_vals),
                    "phi_e_avg": sum(phi_e_vals) / len(phi_e_vals),
                    "phi_total_max": max(phi_total),
                    "gini": gini_coefficient(phi_total),
                    "matthew": matthew_coefficient(phi_total),
                })
        
        return self.history


class TanhCouplingSimulator:
    """tanh() 耦合模拟器（云子方案）"""
    
    def __init__(self, k=0.05, phi0=5.0, gamma=0.2, n=100, steps=3000, seed=42):
        self.k = k
        self.phi0 = phi0
        self.gamma = gamma
        self.n = n
        self.steps = steps
        self.seed = seed
        random.seed(seed)
        
        self.phi = {f"n{i}": 1.0 + random.uniform(-0.1, 0.1) for i in range(n)}
        
        self.edges_out = defaultdict(list)
        self.edges_in = defaultdict(list)
        
        self.history = []
    
    def _calc_gamma_dynamic(self, node_id):
        """动态 γ"""
        out_deg = len(self.edges_out.get(node_id, []))
        in_deg = len(self.edges_in.get(node_id, []))
        out_ratio = out_deg / max(1, in_deg)
        return self.gamma * (1 + 0.5 * out_ratio)
    
    def _select_target_by_phi(self, source):
        """基于 Φ 的 PA 偏好"""
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
    
    def _tanh(self, x, phi0):
        """tanh 近似"""
        # 直接用 math.tanh
        return math.tanh(x / phi0)
    
    def _propagate(self, s, t):
        """图传播 + tanh() 耦合"""
        gain = 5.0
        source = 1.0  # 事件源项
        
        phi_t = self.phi[t]
        
        # tanh() 耦合项
        tanh_term = self._tanh(phi_t, self.phi0)
        source_eff = source * (1 + self.k * tanh_term)
        
        # Φ 更新（单一标量）
        gamma_t = self._calc_gamma_dynamic(t)
        self.phi[t] = phi_t + gain + source_eff - gamma_t * phi_t
        self.phi[t] = max(0.001, self.phi[t])
        
        # 源节点奖励
        self.phi[s] = self.phi[s] + gain * 0.01
        
        # 边记录
        self.edges_out[s].append(t)
        self.edges_in[t].append(s)
    
    def _event(self, node):
        """事件驱动"""
        gain = 0.5
        source = 1.0
        
        phi_t = self.phi[node]
        tanh_term = self._tanh(phi_t, self.phi0)
        source_eff = source * (1 + self.k * tanh_term)
        
        gamma_t = self._calc_gamma_dynamic(node)
        self.phi[node] = phi_t + gain + source_eff - gamma_t * self.phi[node]
        self.phi[node] = max(0.001, self.phi[node])
    
    def run(self):
        """运行模拟"""
        for step in range(self.steps):
            s = random.choice(list(self.phi.keys()))
            t = self._select_target_by_phi(s)
            self._propagate(s, t)
            
            if random.random() < 0.1:
                node = random.choice(list(self.phi.keys()))
                self._event(node)
            
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


def run_e0_baseline(n=100, steps=3000):
    """E0：基线（无耦合）"""
    print("\n=== E0: 基线（无耦合）===")
    
    results = []
    for seed in [42, 123, 456, 789, 1000]:
        sim = MinCouplingSimulator(k=0.0, gamma=0.2, n=n, steps=steps, seed=seed)
        history = sim.run()
        last = history[-1]
        results.append(last)
        print(f"  seed={seed}: phi_max={last['phi_g_max']:.2f}, gini={last['gini']:.4f}")
    
    avg_phi_max = sum(r['phi_g_max'] for r in results) / len(results)
    avg_gini = sum(r['gini'] for r in results) / len(results)
    avg_matthew = sum(r['matthew'] for r in results) / len(results)
    
    print(f"  平均: phi_max={avg_phi_max:.2f}, gini={avg_gini:.4f}, matthew={avg_matthew:.2f}")
    return {"phi_max": avg_phi_max, "gini": avg_gini, "matthew": avg_matthew}


def run_e1_min_coupling(k=0.05, n=100, steps=3000):
    """E1：min() 耦合（X7 方案）"""
    print(f"\n=== E1: min() 耦合 k={k} ===")
    
    results = []
    for seed in [42, 123, 456, 789, 1000]:
        sim = MinCouplingSimulator(k=k, gamma=0.2, n=n, steps=steps, seed=seed)
        history = sim.run()
        last = history[-1]
        results.append(last)
        print(f"  seed={seed}: phi_g_max={last['phi_g_max']:.2f}, phi_e_max={last['phi_e_max']:.2f}, gini={last['gini']:.4f}")
    
    avg_phi_g_max = sum(r['phi_g_max'] for r in results) / len(results)
    avg_phi_e_max = sum(r['phi_e_max'] for r in results) / len(results)
    avg_gini = sum(r['gini'] for r in results) / len(results)
    avg_matthew = sum(r['matthew'] for r in results) / len(results)
    
    print(f"  平均: phi_g_max={avg_phi_g_max:.2f}, phi_e_max={avg_phi_e_max:.2f}, gini={avg_gini:.4f}, matthew={avg_matthew:.2f}")
    return {"phi_g_max": avg_phi_g_max, "phi_e_max": avg_phi_e_max, "gini": avg_gini, "matthew": avg_matthew}


def run_e2_tanh_coupling(k=0.05, phi0=5.0, n=100, steps=3000):
    """E2：tanh() 耦合（云子方案）"""
    print(f"\n=== E2: tanh() 耦合 k={k}, phi0={phi0} ===")
    
    results = []
    for seed in [42, 123, 456, 789, 1000]:
        sim = TanhCouplingSimulator(k=k, phi0=phi0, gamma=0.2, n=n, steps=steps, seed=seed)
        history = sim.run()
        last = history[-1]
        results.append(last)
        print(f"  seed={seed}: phi_max={last['phi_max']:.2f}, gini={last['gini']:.4f}")
    
    avg_phi_max = sum(r['phi_max'] for r in results) / len(results)
    avg_gini = sum(r['gini'] for r in results) / len(results)
    avg_matthew = sum(r['matthew'] for r in results) / len(results)
    
    print(f"  平均: phi_max={avg_phi_max:.2f}, gini={avg_gini:.4f}, matthew={avg_matthew:.2f}")
    return {"phi_max": avg_phi_max, "gini": avg_gini, "matthew": avg_matthew}


def main():
    print("=" * 70)
    print("ECHO 耦合框架对比实验：min() vs tanh()")
    print("E0-E6 实验设计")
    print("=" * 70)
    
    # E0：基线
    e0 = run_e0_baseline()
    
    # E1：min() 耦合（不同 k 值）
    e1_k001 = run_e1_min_coupling(k=0.01)
    e1_k005 = run_e1_min_coupling(k=0.05)
    e1_k010 = run_e1_min_coupling(k=0.10)
    
    # E2：tanh() 耦合（不同 k 和 phi0 值）
    e2_k001_phi1 = run_e2_tanh_coupling(k=0.01, phi0=1.0)
    e2_k005_phi5 = run_e2_tanh_coupling(k=0.05, phi0=5.0)
    e2_k010_phi10 = run_e2_tanh_coupling(k=0.10, phi0=10.0)
    
    # 汇总对比
    print("\n" + "=" * 70)
    print("汇总对比")
    print("=" * 70)
    print(f"{'实验':<20} {'phi_max':<12} {'gini':<10} {'matthew':<10}")
    print("-" * 70)
    print(f"{'E0: 基线(无耦合)':<20} {e0['phi_max']:<12.2f} {e0['gini']:<10.4f} {e0['matthew']:<10.2f}")
    print(f"{'E1: min(k=0.01)':<20} {e1_k001['phi_g_max']:<12.2f} {e1_k001['gini']:<10.4f} {e1_k001['matthew']:<10.2f}")
    print(f"{'E1: min(k=0.05)':<20} {e1_k005['phi_g_max']:<12.2f} {e1_k005['gini']:<10.4f} {e1_k005['matthew']:<10.2f}")
    print(f"{'E1: min(k=0.10)':<20} {e1_k010['phi_g_max']:<12.2f} {e1_k010['gini']:<10.4f} {e1_k010['matthew']:<10.2f}")
    print(f"{'E2: tanh(k=0.01,phi0=1)':<20} {e2_k001_phi1['phi_max']:<12.2f} {e2_k001_phi1['gini']:<10.4f} {e2_k001_phi1['matthew']:<10.2f}")
    print(f"{'E2: tanh(k=0.05,phi0=5)':<20} {e2_k005_phi5['phi_max']:<12.2f} {e2_k005_phi5['gini']:<10.4f} {e2_k005_phi5['matthew']:<10.2f}")
    print(f"{'E2: tanh(k=0.10,phi0=10)':<20} {e2_k010_phi10['phi_max']:<12.2f} {e2_k010_phi10['gini']:<10.4f} {e2_k010_phi10['matthew']:<10.2f}")
    
    print("\n" + "=" * 70)
    print("分析结论")
    print("=" * 70)
    print("1. min() vs tanh() 哪个更稳定？")
    print("2. 哪个更符合 ECHO 物理直觉？")
    print("3. k 值的影响？")


if __name__ == "__main__":
    main()
