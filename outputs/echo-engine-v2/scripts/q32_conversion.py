"""
Q32.32 定点数转换工具
=====================
将引擎 float (0-1) 转换为 Q32.32 定点数（BN254 域）

Q32.32 格式：
- 整数部分：32 bits（高位）
- 小数部分：32 bits（低位）
- 总共：64 bits（1 个 uint256）
- 范围：0 ≤ x < 2^32（因为只表示 [0,1)）

转换公式：
  q32 = floor(float_val * 2^32)
  float_val = q32 / 2^32

误差分析：
  量化误差 ≤ 1/2 * 1/2^32 ≈ 1.16e-10
  M=10^6 步累积误差 < 1e-3（论文 §3.2.4 验证）
"""

import json
import struct
from typing import List, Tuple, Dict, Any
import math

Q32_SCALE = 2 ** 32  # 4294967296


def float_to_q32(value: float) -> int:
    """float (0-1) → Q32.32 uint256"""
    if not (0.0 <= value <= 1.0):
        raise ValueError(f"Value {value} out of range [0,1]")
    q32 = int(value * Q32_SCALE)
    return min(q32, Q32_SCALE - 1)  # clamp to max


def q32_to_float(q32: int) -> float:
    """Q32.32 uint256 → float"""
    return q32 / Q32_SCALE


def float_array_to_q32(arr: List[float]) -> List[int]:
    """批量转换 float array → Q32.32 array"""
    return [float_to_q32(v) for v in arr]


def compute_quantization_error(original: float, q32: int) -> Tuple[float, float]:
    """
    计算量化误差
    返回: (absolute_error, relative_error)
    """
    recovered = q32_to_float(q32)
    abs_err = abs(recovered - original)
    rel_err = abs_err / original if original > 0 else 0.0
    return abs_err, rel_err


def analyze_quantization_errors(phi_float: List[float]) -> Dict[str, Any]:
    """
    分析量化误差统计
    """
    q32_vals = float_array_to_q32(phi_float)
    abs_errors = []
    rel_errors = []

    for f_val, q_val in zip(phi_float, q32_vals):
        if f_val > 0:
            abs_err, rel_err = compute_quantization_error(f_val, q_val)
            abs_errors.append(abs_err)
            rel_errors.append(rel_err)

    return {
        "total_count": len(phi_float),
        "max_abs_error": max(abs_errors) if abs_errors else 0,
        "mean_abs_error": sum(abs_errors) / len(abs_errors) if abs_errors else 0,
        "max_rel_error_pct": max(rel_errors) * 100 if rel_errors else 0,
        "mean_rel_error_pct": (sum(rel_errors) / len(rel_errors) * 100) if rel_errors else 0,
        "q32_max": max(q32_vals) if q32_vals else 0,
        "q32_min": min(q32_vals) if q32_vals else 0,
    }


def generate_test_vectors_from_engine_state(
    nodes: List[Dict],
    edges: List[Dict],
    phi_snapshot: List[float]
) -> Dict[str, Any]:
    """
    从引擎状态生成测试向量（用于 ZK 电路验证）
    """
    q32_phi = float_array_to_q32(phi_snapshot)

    # 量化误差分析
    error_stats = analyze_quantization_errors(phi_snapshot)

    # 累积误差估算（M 步之后）
    M = 1000  # 假设 1000 步
    cumulative_error_bound = M * error_stats["max_abs_error"]

    return {
        "phi_snapshot": phi_snapshot,
        "phi_quantized": q32_phi,
        "error_stats": error_stats,
        "cumulative_error_M1000": cumulative_error_bound,
        "nodes": nodes,
        "edges": edges,
        "format_version": "v0.1",
        "scale_factor": Q32_SCALE,
        "note": f"量化误差 < {error_stats['max_abs_error']:.2e}，"
                f"M=1000步累积 < {cumulative_error_bound:.2e}"
    }


def generate_solidity_test_data(phi_float: List[float]) -> Dict[str, Any]:
    """
    生成 Solidity 合约测试数据（uint256[] 格式）
    """
    q32_vals = float_array_to_q32(phi_float)

    return {
        "phi_quantized_uint256": q32_vals,
        "solidity_format": {
            "type": "uint256[]",
            "length": len(q32_vals),
            "example": f"uint256[] public phi_quantized = new uint256[]({len(q32_vals)});"
        },
        "js_conversion": f"phi.map(v => BigInt(Math.floor(v * {Q32_SCALE})));"
    }


# ============================================================================
# 测试
# ============================================================================

def test_roundtrip():
    """测试 float → Q32 → float 的往返误差"""
    test_values = [0.0, 0.5, 0.999999, 0.123456789, 0.0000001]

    print("=== Q32.32 Roundtrip Test ===")
    for v in test_values:
        q = float_to_q32(v)
        r = q32_to_float(q)
        err = abs(r - v)
        print(f"  {v:.10f} → 0x{q:08X} ({q:10d}) → {r:.10f}  | err={err:.2e}")

    print()
    print("=== Quantization Error Analysis ===")
    errors = analyze_quantization_errors(test_values)
    for k, v in errors.items():
        print(f"  {k}: {v}")


def test_cumulative_error():
    """测试 M 步累积误差是否满足论文要求 (< 1e-3)"""
    # 模拟 phi 值分布（引擎输出的典型范围）
    phi_values = [0.001, 0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99]

    error_stats = analyze_quantization_errors(phi_values)
    M_range = [100, 1000, 10000, 100000, 1000000]

    print("=== Cumulative Error Bound (M steps) ===")
    for M in M_range:
        bound = M * error_stats["max_abs_error"]
        status = "✓ OK" if bound < 1e-3 else "✗ FAIL"
        print(f"  M={M:>7}: bound={bound:.2e}  {status}")


if __name__ == "__main__":
    test_roundtrip()
    print()
    test_cumulative_error()
