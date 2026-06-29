// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Q32_32 — Q32.32 定标库
/// @notice 将浮点数（real）和 Q32.32 定标整数（scaled）互相转换
/// @dev 精度 ~2.3e-10，足够 γ 参数（0.003~0.4）
/// @author Talus（听风）
/// @custom:version v0.4.5 (commit 807317d2)
library Q32_32 {
    /// @notice Q32.32 定标因子 = 2^32
    uint256 internal constant Q32 = 4_294_967_296;

    /// @notice 1e18 定标因子（链上浮点表示）
    uint256 internal constant WAD = 1e18;

    // ============ Errors ============
    error InvalidDecimalChar(bytes1 c);
    error MultipleDots();
    error TooManyDecimals();

    // ============ Core Functions ============

    /// @notice 将 1e18 定标的浮点数打包为 Q32.32
    /// @param real1e18 浮点数（1e18 定标），如 0.05e18 = 50_000_000_000_000_000
    /// @return scaled Q32.32 定标后的 uint256
    /// @dev 公式：scaled = (real1e18 * 2^32 + 1e18/2) / 1e18  (四舍五入)
    function pack(uint256 real1e18) internal pure returns (uint256 scaled) {
        scaled = (real1e18 * Q32 + WAD / 2) / WAD;
    }

    /// @notice 将 Q32.32 定标整数解析为 1e18 定标的浮点数
    /// @param scaled Q32.32 定标后的 uint256
    /// @return real1e18 浮点数（1e18 定标）
    /// @dev 公式：real1e18 = (scaled * 1e18) / 2^32
    function unpack(uint256 scaled) internal pure returns (uint256 real1e18) {
        real1e18 = (scaled * WAD) / Q32;
    }

    /// @notice Round-trip 测试：pack → unpack，验证误差 ≤ 1
    /// @param real1e18 输入浮点数
    /// @return unpacked unpack 后的值（应约等于 real1e18，误差 ≤ 1）
    function testRoundTrip(uint256 real1e18) internal pure returns (uint256 unpacked) {
        uint256 scaled = pack(real1e18);
        unpacked = unpack(scaled);
    }

    // ============ Advanced Functions ============

    /// @notice 从十进制字符串解析浮点数并打包为 Q32.32
    /// @param decimalStr 例如 "0.05"，最多 18 位小数
    /// @return scaled Q32.32 定标后的 uint256
    /// @dev 避免业务层手动 × 1e18 定标
    /// @custom:added 2026-06-29 10:01 UTC（哪吒拍板）
    function packFromDecimal(string memory decimalStr) internal pure returns (uint256 scaled) {
        bytes memory strBytes = bytes(decimalStr);
        uint256 intPart = 0;
        uint256 fracPart = 0;
        uint256 fracDigits = 0;
        bool foundDot = false;

        for (uint256 i = 0; i < strBytes.length; i++) {
            bytes1 c = strBytes[i];
            if (c == 0x2E) {  // '.'
                if (foundDot) revert MultipleDots();
                foundDot = true;
                continue;
            }
            if (c < 0x30 || c > 0x39) revert InvalidDecimalChar(c);
            uint256 digit = uint256(uint8(c)) - 48;  // '0' = 48
            if (!foundDot) {
                intPart = intPart * 10 + digit;
            } else {
                if (fracDigits >= 18) revert TooManyDecimals();
                fracPart = fracPart * 10 + digit;
                fracDigits++;
            }
        }
        // 补齐 18 位小数
        for (uint256 i = fracDigits; i < 18; i++) {
            fracPart = fracPart * 10;
        }
        // 打包：(intPart * 1e18 + fracPart) × 2^32 / 1e18
        scaled = (intPart * WAD + fracPart) * Q32 / WAD;
    }

    // ============ Constants (Common Values) ============

    /// @notice γ = 0.003 → scaled = 12884902
    function GAMMA_MIN_SCALED() internal pure returns (uint256) {
        return 12_884_902;
    }

    /// @notice γ = 0.05 → scaled = 214748365
    function GAMMA_DEFAULT_SCALED() internal pure returns (uint256) {
        return 214_748_365;
    }

    /// @notice γ = 0.4 → scaled = 1717986918
    function GAMMA_MAX_SCALED() internal pure returns (uint256) {
        return 1_717_986_918;
    }
}
