// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

import "./FaucetToken.sol";

/**
  * @title The Compound Evil Test Token
  * @author Compound
  * @notice A simple test token that fails certain operations
  */
contract EvilToken is FaucetToken {
    using SafeMath for uint256;

    bool public fail;

    constructor(uint256 _initialAmount, string memory _tokenName, uint8 _decimalUnits, string memory _tokenSymbol)
        FaucetToken(_initialAmount, _tokenName, _decimalUnits, _tokenSymbol) {
        fail = true;
    }

    function setFail(bool _fail) external {
        fail = _fail;
    }

    function transfer(address dst, uint256 amount) override external returns (bool) {
        if (fail) {
            return false;
        }
        balanceOf[msg.sender] = balanceOf[msg.sender].sub(amount);
        balanceOf[dst] = balanceOf[dst].add(amount);
        emit Transfer(msg.sender, dst, amount);
        return true;
    }

    function transferFrom(address src, address dst, uint256 amount) override external returns (bool) {
        if (fail) {
            return false;
        }
        balanceOf[src] = balanceOf[src].sub(amount);
        balanceOf[dst] = balanceOf[dst].add(amount);
        allowance[src][msg.sender] = allowance[src][msg.sender].sub(amount);
        emit Transfer(src, dst, amount);
        return true;
    }
}
