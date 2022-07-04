pragma solidity = 0.5.17;

import {ComptrollerV7Storage} from "./ComptrollerStorage.sol";
import {Unitroller} from "./Unitroller.sol";
import {EIP20Interface} from "./EIP20Interface.sol";

/**
 * @title Compound's Comptroller Sweeper Contract
 * @author Arr00
 */
contract ComptrollerSweeper is ComptrollerV7Storage {
    /**
     * @notice Become the implementation of the unitroller
     * @param unitroller The address of the unitroller to become
     */
    function _become(Unitroller unitroller) external {
        require(msg.sender == unitroller.admin(), "ComptrollerSweeper::_become: only unitroller admin can change brains");
        require(unitroller._acceptImplementation() == 0, "ComptrollerSweeper::_become: change not authorized");
    }

    /**
     * @notice Sweep ERC-20 tokens from controller (excluding COMP)
     * @dev ERC-20 transfer function is not guaranteed to succeed
     * @param token The address of the ERC-20 token to sweep
     */
    function _sweep(EIP20Interface token) external {
        require(msg.sender == admin, "ComptrollerSweeper::_sweep: only admin can sweep");
        require(address(token) != getCompAddress(), "ComptrollerSweeper::_sweep: can not sweep comp");
        require(token.transfer(admin, token.balanceOf(address(this))), "ComptrollerSweeper::_sweep: transfer failed");
    }

    /**
     * @notice Return the address of the COMP token
     * @return address The address of COMP
     */
    function getCompAddress() public view returns (address) {
        return 0xc00e94Cb662C3520282E6f5717214004A7f26888;
    }
}