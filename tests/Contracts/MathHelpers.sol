// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

contract MathHelpers {

    /*
     * @dev Creates a number like 15e16 as a uint256 from scientific(15, 16).
     */
    function scientific(uint val, uint expTen) pure internal returns (uint) {
        return val * ( 10 ** expTen );
    }

}
