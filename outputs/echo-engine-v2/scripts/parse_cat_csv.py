"""
猫先森 CSV 数据解析器
====================
解析猫先森参数扫描数据，用于 constraint cross-check

预期格式（待确认）：
- rho_dense_scan_20260620.csv: ρ扫描数据
- phi_snapshots_rho0.25_seed0.csv: 势位快照
- adj_edges_rho0.25_seed0.csv: 邻接边数据

用途：
- 提取实际边数 m（用于约束规模估算）
- 提取势位分布（用于 cross-check）
"""

import csv
import json
from typing import Dict, List, Optional, Tuple
from pathlib import Path


def parse_rho_scan(filepath: str) -> Dict:
    """
    解析 rho 扫描数据
    预期列：rho, seed, gini, matthew, diversity, ...
    """
    rows = []
    with open(filepath, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    # 提取 rho 值和对应指标
    rho_values = sorted(set(float(r['rho']) for r in rows))
    return {
        "total_rows": len(rows),
        "rho_values": rho_values,
        "sample": rows[0] if rows else {},
    }


def parse_phi_snapshot(filepath: str) -> Dict:
    """
    解析势位快照数据
    预期列：node_id, phi_value, tier, ...
    """
    rows = []
    with open(filepath, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    phi_values = [float(r['phi_value']) for r in rows if 'phi_value' in r]

    return {
        "total_nodes": len(rows),
        "phi_min": min(phi_values) if phi_values else 0,
        "phi_max": max(phi_values) if phi_values else 0,
        "phi_mean": sum(phi_values) / len(phi_values) if phi_values else 0,
        "phi_sample": phi_values[:10],
    }


def parse_adj_edges(filepath: str) -> Dict:
    """
    解析邻接边数据
    预期列：source_id, target_id, weight, ...
    """
    rows = []
    with open(filepath, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    m_actual = len(rows)

    # 估算稀疏度（实际边数 vs 稠密图 n²）
    # n 需要从文件名或数据中推断，这里先返回
    return {
        "m_actual": m_actual,
        "sample": rows[:5],
    }


def cross_check_constraints(n: int, m: int, rho: float) -> Dict:
    """
    用猫先森实际边数 m 做约束规模 cross-check
    """
    # X7 公式：3n + 2m
    node_constraints = 3 * n
    edge_constraints = 2 * m
    total = node_constraints + edge_constraints

    # 猫先森的实际 WS 参数：k=8, rho_ws = 0.5（重连概率）
    # 理论边数：n*k/2 = n*4
    m_ws = n * 4
    m_dense = int(n * (n - 1) / 2)

    return {
        "n": n,
        "m_actual": m,
        "m_ws_theory": m_ws,
        "m_dense_n2": m_dense,
        "sparsity_ratio": m / m_dense if m_dense > 0 else 0,
        "formula": "3n + 2m",
        "node_constraints": node_constraints,
        "edge_constraints": edge_constraints,
        "total_constraints": total,
        "plonk_ok": total < 100_000_000,
        "ws_comparison": {
            "if_ws_sparse": 3*n + 2*int(m_ws*0.5),
            "if_ws_standard": 3*n + 2*m_ws,
            "if_ws_dense": 3*n + 2*int(m_ws*2),
        }
    }


def run_from_files(rho_csv: str, phi_csv: str, edge_csv: str, n: int = 1000):
    """
    读取猫先森的三个文件，做完整的 cross-check
    """
    print(f"=== 猫先森数据 Cross-Check ===")
    print(f"N = {n}")
    print()

    # 解析边数据
    edge_data = parse_adj_edges(edge_csv)
    m = edge_data["m_actual"]
    print(f"边数 m = {m}")
    print()

    # 解析势位快照
    phi_data = parse_phi_snapshot(phi_csv)
    print(f"势位快照：{phi_data['total_nodes']} 节点")
    print(f"  phi range: [{phi_data['phi_min']:.4f}, {phi_data['phi_max']:.4f}]")
    print(f"  phi mean: {phi_data['phi_mean']:.4f}")
    print()

    # 约束规模 cross-check
    result = cross_check_constraints(n, m, rho=0.25)
    print(f"=== 约束规模 Cross-Check ===")
    print(f"实际边数 m = {m}")
    print(f"WS理论值 m_ws = {result['m_ws_theory']} (k=8)")
    print(f"稠密图 m_n2 = {result['m_dense_n2']}")
    print(f"稀疏度 ratio = {result['sparsity_ratio']:.4f}")
    print()
    print(f"约束估算（3n+2m）：")
    print(f"  节点约束: {result['node_constraints']:,}")
    print(f"  边约束: {result['edge_constraints']:,}")
    print(f"  总约束: {result['total_constraints']:,}")
    print(f"  PLONK: {'✓ OK' if result['plonk_ok'] else '✗ FAIL'}")
    print()
    print(f"WS对比（不同密度）：")
    for label, val in result['ws_comparison'].items():
        print(f"  {label}: {val:,}")

    return result


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--rho_csv", required=True)
    parser.add_argument("--phi_csv", required=True)
    parser.add_argument("--edge_csv", required=True)
    parser.add_argument("--n", type=int, default=1000)
    args = parser.parse_args()

    run_from_files(args.rho_csv, args.phi_csv, args.edge_csv, args.n)
