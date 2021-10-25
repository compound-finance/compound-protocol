pragma solidity ^0.5.16;

import "./ComptrollerStorage.sol";
import "./EIP20NonStandardInterface.sol";

/**
 * @title An intermediary Comptroller implementation to sweep ERC-20s from Comptroller
 * @author Compound
 */
contract Comptroller is ComptrollerV6Storage {
    function sweepToken(EIP20NonStandardInterface token) public {
        uint256 balance = token.balanceOf(address(this));
        token.transfer(admin, balance);
    }
}
