"""
ECHO PDE E0-E8 耦合实验完整代码
E0-E6: X7 代数合成方案（min vs tanh X7变体）
E7-E8: 云子源项耦合方案（单一Φ + tanh源项）
"""

import random
import math
from collections import defaultdict

def gini_coefficient(values):
    """Gini系数"""
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
    """Matthew效应：top 10% 占比"""
    n = len(values)
    if n == 0:
        return 1.0
    sorted_vals = sorted(values, reverse=True)
    top_n = max(1, int(n * top_percent))
    top_avg = sum(sorted_vals[:top_n]) / top_n
    overall_avg = sum(values) / n
    return top_avg / overall_avg if overall_avg > 0 else 1.0


class PDECouplingSimulator:
    """X7 代数合成方案（E0-E6）"""
    
    def __init__(self, coupling_type='min', beta=0.0, k=0.05, gamma=0.2, n=100, steps=3000, seed=42):
        self.coupling_type = coupling_type
        self.beta = beta
        self.k = k
        self.gamma = gamma
        self.n = n
        self.steps = steps
        self.seed = seed
        random.seed(seed)
        
        self.phi_g = {f'n{i}': 1.0 + random.uniform(-0.1, 0.1) for i in range(n)}
        self.phi_e = {f'n{i}': 1.0 + random.uniform(-0.1, 0.1) for i in range(n)}
        
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
    
    def _compute_coupling(self, phi_g, phi_e):
        if self.coupling_type == 'min':
            return self.k * min(phi_g, phi_e)
        elif self.coupling_type == 'tanh':
            tanh_term = math.tanh((phi_g + phi_e) / (2 * 5.0))
            return self.k * tanh_term * min(phi_g, phi_e)
        return 0.0
    
    def step(self):
        s = random.choice(list(self.phi_g.keys()))
        t = self._select_target_by_phi_g(s)
        
        gain = 5.0
        phi_t = self.phi_g[t]
        gamma_t = self._calc_gamma_dynamic(t)
        self.phi_g[t] = phi_t + gain - gamma_t * phi_t
        self.phi_g[t] = max(0.001, self.phi_g[t])
        self.phi_g[s] = self.phi_g.get(s, 1.0) + gain * 0.01
        
        self.edges_out[s].append(t)
        self.edges_in[t].append(s)
        
        if random.random() < 0.5:
            node = random.choice(list(self.phi_e.keys()))
            phi_node = self.phi_e[node]
            coupling = self._compute_coupling(self.phi_g[node], self.phi_e[node])
            self.phi_e[node] = phi_node + 5.0 + coupling
            self.phi_e[node] = max(0.001, self.phi_e[node])
        
        if self.beta > 0:
            for node in self.phi_g.keys():
                phi_g = self.phi_g[node]
                phi_e = self.phi_e[node]
                sat_g = self.beta * phi_g ** 3
                sat_e = self.beta * phi_e ** 3
                self.phi_g[node] = max(0.001, phi_g - sat_g)
                self.phi_e[node] = max(0.001, phi_e - sat_e)
    
    def run(self):
        for step in range(self.steps):
            self.step()
            
            if step % 100 == 0 or step == self.steps - 1:
                phi_g_vals = list(self.phi_g.values())
                phi_e_vals = list(self.phi_e.values())
                phi_total = [phi_g_vals[i] + phi_e_vals[i] + 
                            self._compute_coupling(phi_g_vals[i], phi_e_vals[i]) 
                            for i in range(self.n)]
                
                self.history.append({
                    'step': step + 1,
                    'phi_g_max': max(phi_g_vals),
                    'phi_e_max': max(phi_e_vals),
                    'phi_total_max': max(phi_total),
                    'gini': gini_coefficient(phi_total),
                    'matthew': matthew_coefficient(phi_total),
                })
        
        return self.history


class YunziTanhSimulator:
    """云子源项耦合方案（E7-E8）"""
    
    def __init__(self, phi0=5.0, k=0.05, gamma=0.2, n=100, steps=3000, seed=42):
        self.phi0 = phi0
        self.k = k
        self.gamma = gamma
        self.n = n
        self.steps = steps
        self.seed = seed
        random.seed(seed)
        
        self.phi = {f'n{i}': 1.0 + random.uniform(-0.1, 0.1) for i in range(n)}
        self.edges_out = defaultdict(list)
        self.edges_in = defaultdict(list)
        self.history = []
    
    def _calc_gamma_dynamic(self, node_id):
        out_deg = len(self.edges_out.get(node_id, []))
        in_deg = len(self.edges_in.get(node_id, []))
        out_ratio = out_deg / max(1, in_deg)
        return self.gamma * (1 + 0.5 * out_ratio)
    
    def _select_target(self, source):
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
    
    def step(self):
        s = random.choice(list(self.phi.keys()))
        t = self._select_target(s)
        
        gain = 5.0
        source = 1.0
        phi_t = self.phi[t]
        
        # 云子方案：tanh源项耦合
        tanh_term = math.tanh(phi_t / self.phi0)
        source_eff = source * (1 + self.k * tanh_term)
        
        gamma_t = self._calc_gamma_dynamic(t)
        self.phi[t] = phi_t + gain + source_eff - gamma_t * phi_t
        self.phi[t] = max(0.001, self.phi[t])
        
        self.phi[s] = self.phi.get(s, 1.0) + gain * 0.01
        
        self.edges_out[s].append(t)
        self.edges_in[t].append(s)
        
        if random.random() < 0.5:
            node = random.choice(list(self.phi.keys()))
            phi_node = self.phi[node]
            tanh_term = math.tanh(phi_node / self.phi0)
            source_eff = source * (1 + self.k * tanh_term)
            gamma_node = self._calc_gamma_dynamic(node)
            self.phi[node] = phi_node + gain + source_eff - gamma_node * self.phi[node]
            self.phi[node] = max(0.001, self.phi[node])
    
    def run(self):
        for step in range(self.steps):
            self.step()
            
            if step % 100 == 0 or step == self.steps - 1:
                phi_vals = list(self.phi.values())
                
                self.history.append({
                    'step': step + 1,
                    'phi_max': max(phi_vals),
                    'phi_avg': sum(phi_vals) / len(phi_vals),
                    'gini': gini_coefficient(phi_vals),
                    'matthew': matthew_coefficient(phi_vals),
                })
        
        return self.history


def run_e0_e6():
    """运行 E0-E6（X7 代数合成）"""
    experiments = [
        {'id': 'E0', 'coupling': 'min', 'beta': 0.0, 'k': 0.05},
        {'id': 'E1', 'coupling': 'min', 'beta': 0.05, 'k': 0.05},
        {'id': 'E2', 'coupling': 'tanh', 'beta': 0.0, 'k': 0.05},
        {'id': 'E3', 'coupling': 'tanh', 'beta': 0.05, 'k': 0.05},
        {'id': 'E4', 'coupling': 'min', 'beta': 0.01, 'k': 0.05},
        {'id': 'E5', 'coupling': 'min', 'beta': 0.05, 'k': 0.10},
        {'id': 'E6', 'coupling': 'tanh', 'beta': 0.05, 'k': 0.10},
    ]
    
    results = {}
    for exp in experiments:
        print(f"=== {exp['id']}: {exp['coupling']}, β={exp['beta']}, k={exp['k']} ===")
        exp_results = []
        for seed in [42, 123, 456, 789, 1000]:
            sim = PDECouplingSimulator(
                coupling_type=exp['coupling'],
                beta=exp['beta'],
                k=exp['k'],
                gamma=0.2,
                n=100,
                steps=3000,
                seed=seed
            )
            history = sim.run()
            last = history[-1]
            exp_results.append(last)
            print(f"  seed={seed}: phi_max={last['phi_total_max']:.2f}, gini={last['gini']:.4f}")
        
        avg = {k: sum(r[k] for r in exp_results) / len(exp_results) for k in ['phi_total_max', 'gini', 'matthew']}
        results[exp['id']] = avg
        print(f"  平均: phi_max={avg['phi_total_max']:.2f}, gini={avg['gini']:.4f}, matthew={avg['matthew']:.2f}")
        print()
    
    return results


def run_e7_e8():
    """运行 E7-E8（云子源项耦合）"""
    experiments = [
        {'id': 'E7', 'phi0': 5.0},
        {'id': 'E8', 'phi0': 0.5},
    ]
    
    results = {}
    for exp in experiments:
        print(f"=== {exp['id']}: tanh(云子), Φ₀={exp['phi0']} ===")
        exp_results = []
        for seed in [42, 123, 456, 789, 1000]:
            sim = YunziTanhSimulator(
                phi0=exp['phi0'],
                k=0.05,
                gamma=0.2,
                n=100,
                steps=3000,
                seed=seed
            )
            history = sim.run()
            last = history[-1]
            exp_results.append(last)
            print(f"  seed={seed}: phi_max={last['phi_max']:.2f}, gini={last['gini']:.4f}")
        
        avg = {k: sum(r[k] for r in exp_results) / len(exp_results) for k in ['phi_max', 'gini', 'matthew']}
        results[exp['id']] = avg
        print(f"  平均: phi_max={avg['phi_max']:.2f}, gini={avg['gini']:.4f}, matthew={avg['matthew']:.2f}")
        print()
    
    return results


if __name__ == "__main__":
    print("=" * 70)
    print("ECHO PDE E0-E8 耦合实验")
    print("=" * 70)
    
    print("\n【E0-E6: X7 代数合成方案】")
    results_e0_e6 = run_e0_e6()
    
    print("\n【E7-E8: 云子源项耦合方案】")
    results_e7_e8 = run_e7_e8()
    
    print("\n" + "=" * 70)
    print("汇总对比")
    print("=" * 70)
    print(f"{'ID':<6} {'耦合':<12} {'β':<8} {'Φ₀':<8} {'phi_max':<12} {'gini':<10} {'matthew':<10}")
    print("-" * 70)
    
    all_results = {
        'E0': {'coupling': 'min', 'beta': 0.0, 'phi0': '-', **results_e0_e6['E0']},
        'E1': {'coupling': 'min', 'beta': 0.05, 'phi0': '-', **results_e0_e6['E1']},
        'E2': {'coupling': 'tanh(X7)', 'beta': 0.0, 'phi0': '-', **results_e0_e6['E2']},
        'E3': {'coupling': 'tanh(X7)', 'beta': 0.05, 'phi0': '-', **results_e0_e6['E3']},
        'E4': {'coupling': 'min', 'beta': 0.01, 'phi0': '-', **results_e0_e6['E4']},
        'E5': {'coupling': 'min', 'beta': 0.05, 'phi0': '-', **results_e0_e6['E5']},
        'E6': {'coupling': 'tanh(X7)', 'beta': 0.05, 'phi0': '-', **results_e0_e6['E6']},
        'E7': {'coupling': 'tanh(云子)', 'beta': '-', 'phi0': '5.0', **results_e7_e8['E7']},
        'E8': {'coupling': 'tanh(云子)', 'beta': '-', 'phi0': '0.5', **results_e7_e8['E8']},
    }
    
    for exp_id, data in all_results.items():
        print(f"{exp_id:<6} {data['coupling']:<12} {data['beta']:<8} {data['phi0']:<8} {data['phi_total_max'] if 'phi_total_max' in data else data['phi_max']:<12.2f} {data['gini']:<10.4f} {data['matthew']:<10.2f}")