// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Q32_32.sol";

/// @title VStarViolationStateMachine
/// @notice ECHO V > V* 状态机 — NONE / SOFT_REVERT / HARD_REVERT
/// @dev 基于 Talus v0.4.4 设计文档（commit e4dbfc43）
///      实现 V > V* 检测 + Q32.32 gamma_scaled 事件 emit
/// @author Talus（听风）
/// @custom:version v0.4.4 (commit e4dbfc43)
contract VStarViolationStateMachine {
    using Q32_32 for uint256;

    // ============ Enums ============

    /// @notice 违规状态
    enum ViolationState {
        NONE,           // V ≤ V*: 正常
        SOFT_REVERT,    // V* < V ≤ 1.1·V*: 警告，自动回退
        HARD_REVERT     // V > 1.1·V*: 强制回退
    }

    /// @notice 严重级别
    enum ViolationSeverity {
        NONE,
        SOFT,
        HARD
    }

    // ============ Events ============

    /// @notice V > V* 检测事件
    /// @param nodeId 节点 ID
    /// @param severity 严重级别
    /// @param currentV 当前 V 值
    /// @param VStar 阈值
    /// @param gamma_scaled 当前 gamma（Q32.32 定标）
    /// @param timestamp 检测时间
    event VViolationDetected(
        bytes32 indexed nodeId,
        ViolationSeverity severity,
        uint256 currentV,
        uint256 VStar,
        uint256 gamma_scaled,
        uint256 timestamp
    );

    /// @notice 参数更新事件
    event VStarParametersUpdated(
        uint256 gamma_min_scaled,
        uint256 gamma_max_scaled,
        uint256 S,
        uint256 k,
        uint256 N,
        uint256 beta
    );

    // ============ State Variables ============

    /// @notice V* 阈值（能量有界性临界）
    uint256 public VStar;

    /// @notice 当前 gamma（Q32.32 定标）
    uint256 public gamma_current_scaled;

    /// @notice 最小 gamma（Q32.32 定标）
    uint256 public gamma_min_scaled;

    /// @notice 最大 gamma（Q32.32 定标）
    uint256 public gamma_max_scaled;

    /// @notice 源项 S（1e18 定标）
    uint256 public S;

    /// @notice 反应系数 k（1e18 定标）
    uint256 public k;

    /// @notice 节点数 N
    uint256 public N;

    /// @notice 阻尼系数 beta（1e18 定标）
    uint256 public beta;

    /// @notice 每个节点当前状态
    mapping(bytes32 => ViolationState) public nodeStates;

    /// @notice 治理地址
    address public governance;

    // ============ Modifiers ============

    modifier onlyGovernance() {
        require(msg.sender == governance, "only governance");
        _;
    }

    // ============ Constructor ============

    constructor() {
        governance = msg.sender;

        // P0 工程默认值（哪吒 2026-06-29 15:56 拍板）
        gamma_min_scaled = Q32_32.GAMMA_MIN_SCALED();      // γ=0.003
        gamma_max_scaled = Q32_32.GAMMA_MAX_SCALED();      // γ=0.4（占位，待 X7 推导）
        gamma_current_scaled = Q32_32.GAMMA_DEFAULT_SCALED(); // γ=0.05

        S = 0.1e18;        // 源项
        k = 0.05e18;       // 反应系数
        N = 100;           // P0 默认节点数（生产建议 N=80，留 20% Gas 余量）
        beta = 0.01e18;    // 阻尼系数

        _recomputeVStar();
    }

    // ============ Core Functions ============

    /// @notice 检查节点 V 是否超过 V*
    /// @param nodeId 节点 ID
    /// @param V 当前 V 值
    /// @return state 违规状态
    function checkViolation(bytes32 nodeId, uint256 V) external returns (ViolationState state) {
        if (V <= VStar) {
            state = ViolationState.NONE;
        } else if (V <= VStar * 110 / 100) {  // 1.1·V*
            state = ViolationState.SOFT_REVERT;
            _emitViolationEvent(nodeId, ViolationSeverity.SOFT, V, VStar, gamma_current_scaled);
        } else {
            state = ViolationState.HARD_REVERT;
            _emitViolationEvent(nodeId, ViolationSeverity.HARD, V, VStar, gamma_current_scaled);
        }
        nodeStates[nodeId] = state;
    }

    /// @notice 计算 V* 阈值
    /// @dev V* = [S(1+k)·N·√N/β]^(2/3)
    ///      Solidity 0.8+ 没有浮点，用整数除法 + SafeMath
    function _recomputeVStar() internal {
        // V*² = S(1+k)·N·√N/β
        // 用 Newton-Raphson 近似 √N（避免 precompile）
        uint256 sqrtN = _isqrt(N);

        // numerator = S(1+k)·N·√N
        // 1+k = 1.05e18 (k=0.05)
        uint256 onePlusK = 1e18 + k;
        uint256 numerator = (S * onePlusK / 1e18) * N * sqrtN;

        // V*² = numerator / beta
        uint256 vSquared = numerator / beta;

        // V* = √(vSquared) via isqrt
        VStar = _isqrt(vSquared);
    }

    /// @notice 整数平方根（Newton-Raphson）
    function _isqrt(uint256 x) internal pure returns (uint256 z) {
        if (x == 0) return 0;
        assembly {
            // @custom:gas-optimization 使用 EVM isqrt precompile
            z := shr(1, add(div(x, 1), 1))
            for { } lt(shl(1, z), x) { } {
                z := shr(1, add(add(div(x, z), z), 1))
            }
        }
    }

    /// @notice Emit VViolationDetected 事件
    function _emitViolationEvent(
        bytes32 nodeId,
        ViolationSeverity severity,
        uint256 V,
        uint256 VStarValue,
        uint256 gamma_scaled
    ) internal {
        emit VViolationDetected(nodeId, severity, V, VStarValue, gamma_scaled, block.timestamp);
    }

    // ============ Governance Functions ============

    /// @notice 更新 P0 参数（仅 governance）
    function setVStarParameters(
        uint256 _gamma_min_scaled,
        uint256 _gamma_max_scaled,
        uint256 _S,
        uint256 _k,
        uint256 _N,
        uint256 _beta
    ) external onlyGovernance {
        require(_gamma_min_scaled >= Q32_32.GAMMA_MIN_SCALED(), "gamma_min below safety floor");
        require(_gamma_max_scaled <= Q32_32.GAMMA_MAX_SCALED(), "gamma_max above ceiling");
        require(_gamma_min_scaled <= _gamma_max_scaled, "gamma_min > gamma_max");
        require(_S <= 1e18, "S too high");
        require(_k >= 0 && _k <= 1e18, "k out of range");
        require(_beta >= 0.001e18, "beta too low");

        gamma_min_scaled = _gamma_min_scaled;
        gamma_max_scaled = _gamma_max_scaled;
        gamma_current_scaled = (_gamma_min_scaled + _gamma_max_scaled) / 2;

        S = _S;
        k = _k;
        N = _N;
        beta = _beta;

        _recomputeVStar();

        emit VStarParametersUpdated(
            gamma_min_scaled,
            gamma_max_scaled,
            S,
            k,
            N,
            beta
        );
    }

    /// @notice 转移治理权
    function transferGovernance(address newGovernance) external onlyGovernance {
        require(newGovernance != address(0), "zero address");
        governance = newGovernance;
    }

    // ============ View Functions ============

    /// @notice 获取节点当前状态
    function currentState(bytes32 nodeId) external view returns (ViolationState) {
        return nodeStates[nodeId];
    }

    /// @notice 获取 V* 阈值
    function computeVStar() external view returns (uint256) {
        return VStar;
    }

    /// @notice 获取当前 gamma（real）
    function gammaCurrent() external view returns (uint256) {
        return Q32_32.unpack(gamma_current_scaled);
    }
}
