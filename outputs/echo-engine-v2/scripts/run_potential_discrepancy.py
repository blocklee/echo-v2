#!/usr/bin/env python3
"""
#1 势位公式错位（引擎部分）
对比 shigraph_core.py v2.0 引擎 normalized_shi (0-1) vs 链上 calculatePotential (uint256 0-2000)
输出：节点 + 边的势位对比，差距曲线
"""
import sys
import json
import os
from pathlib import Path

# 让脚本能 import 引擎模块
sys.path.insert(0, str(Path(__file__).parent.parent / "echo-sim"))

from shigraph_core import ShiGraphEngine, FourRights, EdgeType, Node, FourRightsStatus

def run_discrepancy_test():
    """跑引擎 vs 链上模拟势位对比"""
    engine = ShiGraphEngine()

    # 创世节点（模拟 14 张已部署卡）
    founders = []
    for i, founder in enumerate(["Nezha", "Yuwa", "Seaman", "X7", "Cat", "M77", "Wanglan", "Liman", "Talus", "Yunzi", "Amanda", "Founder1", "Founder2", "Founder3"][:14]):
        node = engine.create_node(
            creator_id=founder,
            content_hash=f"hash_{founder}_{i}",
            four_rights=FourRights(
                use_status=FourRightsStatus.OPEN,
                use_fee_rate=0.05,
                derive_status=FourRightsStatus.OPEN,
                derive_max_depth=3,
                expand_status=FourRightsStatus.OPEN,
                expand_scope="global",
                benefit_tier=3,
            )
        )
        founders.append(node.id)

    # 编排边（模拟 11 个卡组 = 边）
    # 用真实编排模式：每个创作者引用前面 2-3 个节点
    edges_count = 11
    edge_idx = 0
    for i, src in enumerate(founders):
        if edge_idx >= edges_count:
            break
        # 编排引用后续 1-2 个节点
        for j in range(1, min(3, len(founders) - i)):
            if edge_idx >= edges_count:
                break
            tgt = founders[i + j]
            engine.create_edge(
                edge_type=EdgeType.ARRANGE,
                source_id=src,
                target_id=tgt,
                weight=0.5 + (i + j) * 0.05,
                depth=j,
            )
            edge_idx += 1

    # 重算所有势位
    engine.recalculate_all_shi()

    # 输出对比数据
    results = {
        "engine_nodes": {},
        "simulated_chain_potential": {},
        "discrepancy": {},
    }

    # 设置桥接边（1/3 边是跨社区）
    edge_ids = list(engine.edges.keys())
    for idx, eid in enumerate(edge_ids):
        if idx % 3 == 0:
            engine.edges[eid].is_bridge = True
            engine.edges[eid].bridge_bonus = 1.5

    for nid in engine.nodes:
        engine_shi = engine.get_shi_position(nid)
        tier = engine.get_tier(nid)

        # 模拟链上公式：basePotential × 0.98^n + useCount/10×5% + bridgeCount×2%
        node = engine.nodes[nid]
        incoming = engine.get_incoming_edges(nid)
        bridge_count = sum(1 for e in incoming if e.is_bridge)
        use_count = len(incoming)  # 简化：入边数 = 使用数

        # 假设 basePotential = 1000（链上默认值）
        base = 1000
        chain_potential = base * (0.98 ** use_count) + (use_count / 10) * 0.05 * base + bridge_count * 0.02 * base

        # 归一化映射（链上 0-2000 → 引擎 0-1）
        chain_normalized = min(chain_potential / 2000.0, 1.0)

        results["engine_nodes"][nid] = {
            "shi_normalized": engine_shi,
            "tier": tier,
        }
        results["simulated_chain_potential"][nid] = {
            "chain_potential_uint256": int(chain_potential),
            "chain_normalized": chain_normalized,
            "use_count": use_count,
            "bridge_count": bridge_count,
        }
        results["discrepancy"][nid] = {
            "abs_diff": abs(engine_shi - chain_normalized),
            "rel_diff": abs(engine_shi - chain_normalized) / max(engine_shi, 0.001),
            "engine_shi": engine_shi,
            "chain_normalized": chain_normalized,
        }

    return results


if __name__ == "__main__":
    out = run_discrepancy_test()

    # 统计
    abs_diffs = [v["abs_diff"] for v in out["discrepancy"].values()]
    rel_diffs = [v["rel_diff"] for v in out["discrepancy"].values()]

    print("=" * 60)
    print("#1 势位公式错位（引擎 vs 模拟链上）结果")
    print("=" * 60)
    print(f"节点数: {len(out['engine_nodes'])}")
    print(f"绝对差 平均: {sum(abs_diffs)/len(abs_diffs):.4f}, 最大: {max(abs_diffs):.4f}, 最小: {min(abs_diffs):.4f}")
    print(f"相对差 平均: {sum(rel_diffs)/len(rel_diffs):.4f}, 最大: {max(rel_diffs):.4f}, 最小: {min(rel_diffs):.4f}")
    print()
    print("节点明细（前 5）:")
    for i, (nid, v) in enumerate(list(out["discrepancy"].items())[:5]):
        print(f"  {nid[:30]:30s}  引擎={v['engine_shi']:.4f}  链上={v['chain_normalized']:.4f}  差={v['abs_diff']:.4f}  相对差={v['rel_diff']:.2%}")

    # 落盘
    out_path = Path(__file__).parent.parent / "potential-discrepancy-engine.json"
    with open(out_path, "w") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    print(f"\n落盘: {out_path}")
