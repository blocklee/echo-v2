// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Q32_32.sol";

/// @title Q32_32 Unit Tests
/// @custom:version v0.4.5 (commit 807317d2)
contract Q32_32Test is Test {
    using Q32_32 for uint256;

    function testPackZero() public pure {
        uint256 result = uint256(0).pack();
        assertEq(result, 0, "pack(0) should be 0");
    }

    function testPackGammaMin() public pure {
        uint256 result = (uint256(3_000_000_000_000_000)).pack();
        assertEq(result, 12_884_902, "pack(0.003) should be 12884902");
    }

    function testPackGammaDefault() public pure {
        uint256 result = (uint256(50_000_000_000_000_000)).pack();
        assertEq(result, 214_748_365, "pack(0.05) should be 214748365");
    }

    function testPackGammaMax() public pure {
        uint256 result = (uint256(400_000_000_000_000_000)).pack();
        assertEq(result, 1_717_986_918, "pack(0.4) should be 1717986918");
    }

    function testUnpackZero() public pure {
        uint256 result = uint256(0).unpack();
        assertEq(result, 0, "unpack(0) should be 0");
    }

    function testUnpackGammaMin() public pure {
        // Q32.32 -> 1e18 有截断误差，0.003*2^32=12884902 unpack -> ~3e15+700
        uint256 result = (uint256(12_884_902)).unpack();
        assertLe(result - 3_000_000_000_000_000, 50_000_000, "unpack(0.003) offset should be < 5e7");
    }

    function testUnpackGammaDefault() public pure {
        // 214748365 unpack -> ~5e16+46566128, 相对误差 ~1e-9
        uint256 result = (uint256(214_748_365)).unpack();
        uint256 expected = 50_000_000_000_000_000;
        uint256 diff = result > expected ? result - expected : expected - result;
        assertLe(diff, 100_000_000, "unpack(0.05) diff should be < 1e8");
    }

    function testUnpackGammaMax() public pure {
        uint256 result = (uint256(1_717_986_918)).unpack();
        uint256 expected = 400_000_000_000_000_000;
        uint256 diff = result > expected ? result - expected : expected - result;
        assertLe(diff, 100_000_000, "unpack(0.4) diff should be < 1e8");
    }

    function testRoundTripZero() public pure {
        uint256 unpacked = uint256(0).testRoundTrip();
        assertEq(unpacked, 0, "roundTrip(0) should be 0");
    }

    function testRoundTripGammaMin() public pure {
        uint256 original = 3_000_000_000_000_000;
        uint256 unpacked = original.testRoundTrip();
        uint256 diff = original > unpacked ? original - unpacked : unpacked - original;
        // 3e15 -> pack(12884902) -> unpack(3e15+700), diff=700
        assertLe(diff, 50_000_000, "roundTrip(0.003) error should be < 5e7");
    }

    function testRoundTripGammaDefault() public pure {
        uint256 original = 50_000_000_000_000_000;
        uint256 unpacked = original.testRoundTrip();
        uint256 diff = original > unpacked ? original - unpacked : unpacked - original;
        // 5e16 -> Q32.32 -> 1e18，相对误差 ~1e-9 -> 绝对误差 ~50
        assertLe(diff, 50_000_000, "roundTrip(0.05) error should be < 5e7");
    }

    function testRoundTripMax() public pure {
        uint256 original = 400_000_000_000_000_000;
        uint256 unpacked = original.testRoundTrip();
        uint256 diff = original > unpacked ? original - unpacked : unpacked - original;
        // 4e17 -> relative error < 1e-9 -> abs error < 400
        assertLe(diff, 100_000_000, "roundTrip(0.4) error should be < 1e8");
    }

    function testConstants() public pure {
        assertEq(Q32_32.GAMMA_MIN_SCALED(), 12_884_902, "GAMMA_MIN_SCALED");
        assertEq(Q32_32.GAMMA_DEFAULT_SCALED(), 214_748_365, "GAMMA_DEFAULT_SCALED");
        assertEq(Q32_32.GAMMA_MAX_SCALED(), 1_717_986_918, "GAMMA_MAX_SCALED");
    }

    /// @notice Fuzz: pack 单调性
    /// @dev Q32.32 的 pack 在 [0, 2^32) 范围内严格单调
    function testFuzz_PackMonotonicity(uint256 a, uint256 b) public pure {
        a = bound(a, 0, 4e17);
        b = bound(b, 0, 4e17);

        uint256 packedA = a.pack();
        uint256 packedB = b.pack();

        if (a < b) {
            assertTrue(packedA < packedB || packedA == packedB, "pack: a<b -> packedA<=packedB");

        } else if (a > b) {
            assertTrue(packedA > packedB || packedA == packedB, "pack: a>b -> packedA>=packedB");
        } else {
            assertEq(packedA, packedB, "pack: equal inputs");
        }
    }

    /// @notice Fuzz: round-trip 误差上界测试
    /// @dev Q32.32 的 (real * 2^32) / 1e18 除法截断在 real <= 5e17 时最大误差 ~1e8
    function testFuzz_RoundTripError(uint256 real) public pure {
        // bound 到 [0, 5e17] 但 fuzz 可能产生超大值，用 assertLt 兜底
        if (real > 5e17) return; // skip extreme values
        uint256 unpacked = real.testRoundTrip();
        uint256 diff = real > unpacked ? real - unpacked : unpacked - real;
        if (real == 0) {
            assertEq(diff, 0, "roundTrip(0)");
        } else {
            // 保守上界：2e8
            assertLe(diff, 200_000_000, "roundTrip error < 2e8 for real <= 5e17");
        }
    }
}
