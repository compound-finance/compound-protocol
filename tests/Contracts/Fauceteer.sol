pragma solidity ^0.5.16;

import "../../contracts/EIP20Interface.sol";

/**
  * @title Fauceteer
  * @author Compound
  * @notice First computer program to be part of The Giving Pledge
  */
contract Fauceteer {

    /**
      * @notice Drips some tokens to caller
      * @dev We send 0.01% of our tokens to the caller. Over time, the amount will tend toward and eventually reach zero.
      * @param token The token to drip. Note: if we have no balance in this token, function will revert.
      */
    function drip(EIP20Interface token) public {
        uint balance = token.balanceOf(address(this));
        require(balance > 0, "Fauceteer is empty");
        token.transfer(msg.sender, balance / 10000); // 0.01%
    }
}
