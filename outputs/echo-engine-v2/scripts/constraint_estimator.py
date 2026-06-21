"""
ZK 约束规模估算器
================
基于 X7 v0.1 公式：单步约束数 = 3n + 2m
(n=节点数, m=边数)

用途：
- 估算不同网络规模下的 ZK 电路约束数
- 判断是否在 PLONK 上限（10^8）内
- 为 Gas 估算提供输入
"""

import json
from typing import Dict, Tuple


def estimate_constraints(n_nodes: int, m_edges: int) -> Dict[str, int]:
    """
    估算 ZK 约束规模

    公式：3n + 2m（X7 v0.1）
    - 3n：节点相关约束（每节点 3 个约束）
    - 2m：边相关约束（每边 2 个约束）
    """
    node_constraints = 3 * n_nodes
    edge_constraints = 2 * m_edges
    total = node_constraints + edge_constraints

    return {
        "n_nodes": n_nodes,
        "m_edges": m_edges,
        "node_constraints": node_constraints,
        "edge_constraints": edge_constraints,
        "total_constraints": total,
        "formula": "3n + 2m",
    }


def check_plonk_feasibility(total_constraints: int) -> Dict[str, any]:
    """
    判断 PLONK 是否可行
    PLONK 上限：~10^8 约束
    """
    PLONK_LIMIT = 100_000_000

    feasible = total_constraints < PLONK_LIMIT
    headroom_pct = (PLONK_LIMIT - total_constraints) / PLONK_LIMIT * 100

    return {
        "feasible": feasible,
        "limit": PLONK_LIMIT,
        "headroom_pct": round(headroom_pct, 2),
        "status": "✓ PLONK OK" if feasible else "✗ 超出 PLONK 上限",
    }


def estimate_gas(total_constraints: int) -> Dict[str, int]:
    """
    粗估 Gas 消耗（基于 PLONK 验证的典型值）

    经验值：
    - 每 1000 约束 ≈ 5000 Gas（PLONK 验证）
    - 实际取决于电路结构和聚合方案
    """
    GAS_PER_1K_CONSTRAINTS = 5000
    estimated = (total_constraints / 1000) * GAS_PER_1K_CONSTRAINTS
    return {
        "estimated_gas": int(estimated),
        "note": "粗估，实际需实测",
        "per_1k_constraints": GAS_PER_1K_CONSTRAINTS,
    }


def estimate_proof_size(total_constraints: int) -> Dict[str, float]:
    """
    估算证明大小（KB）

    经验值：
    - PLONK 证明：~few KB（10-20KB）
    - Groth16 证明：~0.5-1KB（更小但需可信设置）
    - 实际取决于约束数和聚合方案
    """
    PLONK_KB = 15.0  # 中位估计
    return {
        "plonk_proof_kb": PLONK_KB,
        "note": "PLONK 典型值，实际取决于聚合",
    }


def ws_network_params(n: int, k: int = 8, avg_degree_multiplier: float = 1.0) -> Tuple[int, int]:
    """
    Watts-Strogatz 小世界网络参数估算

    k：每个节点的平均邻居数（默认 8）
    avg_degree_multiplier：密度调节因子（1.0=标准，<1=稀疏，>1=稠密）
    """
    m_estimated = int((n * k * avg_degree_multiplier) / 2)
    return n, m_estimated


def run_scenarios():
    """运行典型场景估算"""
    scenarios = [
        ("测试网 N=1000, k=8, 稀疏", 1000, "ws_sparse", 8, 0.5),
        ("测试网 N=1000, k=8, 标准", 1000, "ws_standard", 8, 1.0),
        ("测试网 N=1000, k=8, 稠密", 1000, "ws_dense", 8, 2.0),
        ("主网 N=10000, k=8, 标准", 10000, "ws_main_standard", 8, 1.0),
        ("主网 N=10000, k=8, 稀疏", 10000, "ws_main_sparse", 8, 0.5),
        ("ECHO对战 N=100, k=6, 标准", 100, "battle", 6, 1.0),
    ]

    print("=" * 70)
    print("ZK 约束规模估算 — X7 v0.1 公式: 3n + 2m")
    print("=" * 70)

    results = []
    for label, n, scenario_id, k, density in scenarios:
        _, m = ws_network_params(n, k, density)
        c = estimate_constraints(n, m)
        plonk = check_plonk_feasibility(c["total_constraints"])
        gas = estimate_gas(c["total_constraints"])
        proof = estimate_proof_size(c["total_constraints"])

        print(f"\n{label}")
        print(f"  节点 n={n}, 边 m={m} (k={k}, density={density})")
        print(f"  约束：3n+2m = {c['node_constraints']} + {c['edge_constraints']} = {c['total_constraints']:,}")
        print(f"  PLONK：{plonk['status']} (上限 {plonk['limit']:,}, 余量 {plonk['headroom_pct']:.1f}%)")
        print(f"  Gas估算：~{gas['estimated_gas']:,}")
        print(f"  证明大小：~{proof['plonk_proof_kb']} KB")

        results.append({
            "scenario": label,
            **c,
            **plonk,
            **gas,
            **proof,
        })

    return results


def main():
    import argparse

    parser = argparse.ArgumentParser(description="ZK 约束规模估算")
    parser.add_argument("--n", type=int, default=1000, help="节点数")
    parser.add_argument("--m", type=int, default=None, help="边数（不填则用 WS 模型估算）")
    parser.add_argument("--k", type=int, default=8, help="WS 模型平均度")
    parser.add_argument("--density", type=float, default=1.0, help="密度因子")
    args = parser.parse_args()

    if args.m is not None:
        n, m = args.n, args.m
    else:
        n, m = ws_network_params(args.n, args.k, args.density)

    c = estimate_constraints(n, m)
    plonk = check_plonk_feasibility(c["total_constraints"])
    gas = estimate_gas(c["total_constraints"])
    proof = estimate_proof_size(c["total_constraints"])

    print(f"n={n}, m={m}")
    print(f"约束总数：{c['total_constraints']:,}")
    print(f"PLONK：{plonk['status']}")
    print(f"Gas估算：~{gas['estimated_gas']:,}")
    print(f"证明大小：~{proof['plonk_proof_kb']} KB")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        main()
    else:
        run_scenarios()
