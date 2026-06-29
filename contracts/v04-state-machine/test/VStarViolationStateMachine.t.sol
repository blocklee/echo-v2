// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/VStarViolationStateMachine.sol";
import "../src/Q32_32.sol";

/// @title VStarViolationStateMachine Unit Tests
/// @custom:version v0.4.4 (commit e4dbfc43)
contract VStarViolationStateMachineTest is Test {
    VStarViolationStateMachine sm;

    bytes32 TEST_NODE = keccak256("test-node-1");

    function setUp() public {
        sm = new VStarViolationStateMachine();
    }

    function testConstructor_GammaValues() public view {
        assertEq(sm.gamma_min_scaled(), Q32_32.GAMMA_MIN_SCALED(), "gamma_min_scaled should be 12884902");
        assertEq(sm.gamma_max_scaled(), Q32_32.GAMMA_MAX_SCALED(), "gamma_max_scaled should be 1717986918");
        assertEq(sm.gamma_current_scaled(), Q32_32.GAMMA_DEFAULT_SCALED(), "gamma_current_scaled should be 214748365");
    }

    function testConstructor_DefaultValues() public view {
        assertEq(sm.S(), 0.1e18, "S should be 0.1e18");
        assertEq(sm.k(), 0.05e18, "k should be 0.05e18");
        assertEq(sm.N(), 100, "N should be 100");
        assertEq(sm.beta(), 0.01e18, "beta should be 0.01e18");
    }

    function testConstructor_CurrentGovernance() public view {
        assertEq(sm.governance(), address(this), "governance should be deployer");
    }

    function testGammaCurrent() public view {
        uint256 gammaReal = sm.gammaCurrent();
        // gammaCurrent unpacks Q32.32 → 有 ~4.6e7 截断误差
        assertLe(gammaReal, 50_000_000_000_046_566_128, "gammaCurrent should be ~0.05");
        assertGe(gammaReal, 50_000_000_000_000_000, "gammaCurrent should be ~0.05");
    }

    function testCheckViolation_NONE() public {
        VStarViolationStateMachine.ViolationState state = sm.checkViolation(TEST_NODE, 0);
        assertEq(uint(state), 0, "state should be NONE");
    }

    function testCheckViolation_NONE_atVStar() public {
        uint256 VStar = sm.VStar();
        VStarViolationStateMachine.ViolationState state = sm.checkViolation(TEST_NODE, VStar);
        assertEq(uint(state), 0, "state should be NONE when V == VStar");
    }

    function testCheckViolation_NONE_belowVStar() public {
        uint256 VStar = sm.VStar();
        VStarViolationStateMachine.ViolationState state = sm.checkViolation(TEST_NODE, VStar - 1);
        assertEq(uint(state), 0, "state should be NONE when V < VStar");
    }

    function testCheckViolation_SOFT() public {
        uint256 VStar = sm.VStar();
        uint256 V = VStar * 105 / 100;
        VStarViolationStateMachine.ViolationState state = sm.checkViolation(TEST_NODE, V);
        assertEq(uint(state), 1, "state should be SOFT_REVERT");
    }

    function testCheckViolation_SOFT_boundary() public {
        uint256 VStar = sm.VStar();
        uint256 V = VStar * 110 / 100;
        VStarViolationStateMachine.ViolationState state = sm.checkViolation(TEST_NODE, V);
        assertEq(uint(state), 1, "state should be SOFT at V = 1.1*VStar");
    }

    function testCheckViolation_HARD() public {
        uint256 VStar = sm.VStar();
        uint256 V = VStar * 150 / 100;
        VStarViolationStateMachine.ViolationState state = sm.checkViolation(TEST_NODE, V);
        assertEq(uint(state), 2, "state should be HARD_REVERT");
    }

    function testNodeStates_update() public {
        sm.checkViolation(TEST_NODE, 0);
        assertEq(uint(sm.currentState(TEST_NODE)), 0, "node should be NONE");

        sm.checkViolation(TEST_NODE, sm.VStar() * 2);
        assertEq(uint(sm.currentState(TEST_NODE)), 2, "node should be HARD after V > 1.1*VStar");
    }

    function testInvariant_StateMonotonicity() public {
        uint256 VStar = sm.VStar();
        bytes32 nodeId = keccak256("monotonicity-test");
        
        VStarViolationStateMachine.ViolationState state1 = sm.checkViolation(nodeId, VStar - 1);
        VStarViolationStateMachine.ViolationState state2 = sm.checkViolation(nodeId, VStar * 105 / 100);
        VStarViolationStateMachine.ViolationState state3 = sm.checkViolation(nodeId, VStar * 150 / 100);
        
        assertEq(uint(state1), 0, "NONE");
        assertEq(uint(state2), 1, "SOFT");
        assertEq(uint(state3), 2, "HARD");
    }

    function testSetVStarParameters_success() public {
        sm.setVStarParameters(
            Q32_32.GAMMA_MIN_SCALED(),
            Q32_32.GAMMA_MAX_SCALED(),
            0.2e18,
            0.1e18,
            80,
            0.02e18
        );
        assertEq(sm.S(), 0.2e18, "S should be updated");
        assertEq(sm.N(), 80, "N should be updated");
        assertEq(sm.beta(), 0.02e18, "beta should be updated");
        assertTrue(sm.VStar() > 0, "VStar should be recomputed");
    }

    function testSetVStarParameters_gamma_min_floor() public {
        vm.expectRevert("gamma_min below safety floor");
        sm.setVStarParameters(
            Q32_32.GAMMA_MIN_SCALED() - 1,
            Q32_32.GAMMA_MAX_SCALED(),
            0.1e18, 0.05e18, 100, 0.01e18
        );
    }

    function testSetVStarParameters_gamma_max_ceiling() public {
        vm.expectRevert("gamma_max above ceiling");
        sm.setVStarParameters(
            Q32_32.GAMMA_MIN_SCALED(),
            Q32_32.GAMMA_MAX_SCALED() + 1,
            0.1e18, 0.05e18, 100, 0.01e18
        );
    }

    function testSetVStarParameters_gamma_min_gt_max() public {
        vm.expectRevert("gamma_min > gamma_max");
        sm.setVStarParameters(
            Q32_32.GAMMA_DEFAULT_SCALED() + 1,
            Q32_32.GAMMA_MIN_SCALED(),
            0.1e18, 0.05e18, 100, 0.01e18
        );
    }

    function testSetVStarParameters_S_too_high() public {
        vm.expectRevert("S too high");
        sm.setVStarParameters(
            Q32_32.GAMMA_MIN_SCALED(),
            Q32_32.GAMMA_MAX_SCALED(),
            2e18, 0.05e18, 100, 0.01e18
        );
    }

    function testSetVStarParameters_beta_too_low() public {
        vm.expectRevert("beta too low");
        sm.setVStarParameters(
            Q32_32.GAMMA_MIN_SCALED(),
            Q32_32.GAMMA_MAX_SCALED(),
            0.1e18, 0.05e18, 100, 0.0001e18
        );
    }
}
