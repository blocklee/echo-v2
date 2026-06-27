"""
ECHO 耦合框架对比实验 v2：min() vs tanh()
修正版：增加事件驱动的影响

问题：上次实验中 Φ_g 增长太快，Φ_e 几乎无效
修正：增加事件频率，增加 Φ_e 的影响
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


class MinCouplingSimulatorV2:
    """min() 耦合模拟器 v2 - 增加事件频率"""
    
    def __init__(self, k=0.05, gamma=0.2, n=100, steps=3000, seed=42):
        self.k = k
        self.gamma = gamma
        self.n = n
        self.steps = steps
        self.seed = seed
        random.seed(seed)
        
        # 分离的势位池
        self.phi_g = {f"n{i}": 1.0 + random.uniform(-0.1, 0.1) for i in range(n)}
        self.phi_e = {f"n{i}": 1.0 + random.uniform(-0.1, 0.1) for i in range(n)}
        
        # 边记录
        self.edges_out = defaultdict(list)
        self.edges_in = defaultdict(list)
        
        self.history = []
        
    def _calc_gamma_dynamic(self, node_id):
        out_deg = len(self.edges_out.get(node_id, []))
        in_deg = len(self.edges_in.get(node_id, []))
        out_ratio = out_deg / max(1, in_deg)
        return self.gamma * (1 + 0.5 * out_ratio)
    
    def _select_target_by_phi_g(self, source):
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
        """图传播"""
        gain = 5.0
        
        gamma_g = self._calc_gamma_dynamic(t)
        self.phi_g[t] = self.phi_g[t] + gain - gamma_g * self.phi_g[t]
        self.phi_g[t] = max(0.001, self.phi_g[t])
        
        self.phi_g[s] = self.phi_g.get(s, 1.0) + gain * 0.01
        
        self.edges_out[s].append(t)
        self.edges_in[t].append(s)
    
    def _event(self, node):
        """事件驱动 - 增加影响"""
        # 增加事件增益，从 0.5 增到 5.0
        gain = 5.0
        
        phi_g_t = self.phi_g[node]
        phi_e_t = self.phi_e[node]
        
        # min() 耦合
        cross = self.k * min(phi_g_t, phi_e_t)
        
        # Φ_e 更新（事件驱动 + 耦合）
        self.phi_e[node] = phi_e_t + gain + cross
        self.phi_e[node] = max(0.001, self.phi_e[node])
        
        # Φ_g 衰减
        self.phi_g[node] = phi_g_t * (1 - self.gamma)
        self.phi_g[node] = max(0.001, self.phi_g[node])
    
    def run(self):
        for step in range(self.steps):
            s = random.choice(list(self.phi_g.keys()))
            t = self._select_target_by_phi_g(s)
            self._propagate(s, t)
            
            # 增加事件频率：从 10% 增到 50%
            if random.random() < 0.5:
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
                    "phi_total_max": max(phi_total),
                    "gini": gini_coefficient(phi_total),
                    "matthew": matthew_coefficient(phi_total),
                })
        
        return self.history


class TanhCouplingSimulatorV2:
    """tanh() 耦合模拟器 v2"""
    
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
        out_deg = len(self.edges_out.get(node_id, []))
        in_deg = len(self.edges_in.get(node_id, []))
        out_ratio = out_deg / max(1, in_deg)
        return self.gamma * (1 + 0.5 * out_ratio)
    
    def _select_target_by_phi(self, source):
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
    
    def _propagate(self, s, t):
        gain = 5.0
        source = 1.0
        
        phi_t = self.phi[t]
        tanh_term = math.tanh(phi_t / self.phi0)
        source_eff = source * (1 + self.k * tanh_term)
        
        gamma_t = self._calc_gamma_dynamic(t)
        self.phi[t] = phi_t + gain + source_eff - gamma_t * phi_t
        self.phi[t] = max(0.001, self.phi[t])
        
        self.phi[s] = self.phi.get(s, 1.0) + gain * 0.01
        
        self.edges_out[s].append(t)
        self.edges_in[t].append(s)
    
    def _event(self, node):
        gain = 5.0
        source = 1.0
        
        phi_t = self.phi[node]
        tanh_term = math.tanh(phi_t / self.phi0)
        source_eff = source * (1 + self.k * tanh_term)
        
        gamma_t = self._calc_gamma_dynamic(node)
        self.phi[node] = phi_t + gain + source_eff - gamma_t * self.phi[node]
        self.phi[node] = max(0.001, self.phi[node])
    
    def run(self):
        for step in range(self.steps):
            s = random.choice(list(self.phi.keys()))
            t = self._select_target_by_phi(s)
            self._propagate(s, t)
            
            if random.random() < 0.5:
                node = random.choice(list(self.phi.keys()))
                self._event(node)
            
            if step % 100 == 0 or step == self.steps - 1:
                phi_vals = list(self.phi.values())
                
                self.history.append({
                    "step": step + 1,
                    "phi_max": max(phi_vals),
                    "gini": gini_coefficient(phi_vals),
                    "matthew": matthew_coefficient(phi_vals),
                })
        
        return self.history


def run_experiment(sim_class, **kwargs):
    """运行实验"""
    results = []
    for seed in [42, 123, 456, 789, 1000]:
        sim = sim_class(seed=seed, **kwargs)
        history = sim.run()
        last = history[-1]
        results.append(last)
        print(f"  seed={seed}: phi_max={last.get('phi_max', last.get('phi_g_max', 0)):.2f}, gini={last['gini']:.4f}")
    
    keys = results[0].keys()
    avg = {}
    for k in keys:
        if k == 'step':
            continue
        vals = [r[k] for r in results]
        avg[k] = sum(vals) / len(vals)
    
    return avg


def main():
    print("=" * 70)
    print("ECHO 耦合框架对比实验 v2：min() vs tanh()")
    print("修正：增加事件频率，让 Φ_e 有更大影响")
    print("=" * 70)
    
    n, steps = 100, 3000
    gamma = 0.2
    
    # E0：基线（无耦合）
    print("\n=== E0: 基线（无耦合 k=0）===")
    e0 = run_experiment(MinCouplingSimulatorV2, k=0.0, gamma=gamma, n=n, steps=steps)
    
    # E1：min() 耦合
    for k in [0.01, 0.05, 0.10]:
        print(f"\n=== E1: min() 耦合 k={k} ===")
        e1 = run_experiment(MinCouplingSimulatorV2, k=k, gamma=gamma, n=n, steps=steps)
    
    # E2：tanh() 耦合
    for k, phi0 in [(0.01, 1.0), (0.05, 5.0), (0.10, 10.0)]:
        print(f"\n=== E2: tanh() 耦合 k={k}, phi0={phi0} ===")
        e2 = run_experiment(TanhCouplingSimulatorV2, k=k, phi0=phi0, gamma=gamma, n=n, steps=steps)
    
    print("\n" + "=" * 70)
    print("汇总对比（最终步）")
    print("=" * 70)


if __name__ == "__main__":
    main()
