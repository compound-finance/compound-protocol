pragma solidity ^0.5.12;

import "./StandardToken.sol";

/**
  * @title The Compound Evil Test Token
  * @author Compound
  * @notice A simple test token that fails certain operations
  */
contract EvilToken is StandardToken {
    string public name;
    string public symbol;
    uint8 public decimals;
    bool public fail;

    constructor(uint256 _initialAmount, string memory _tokenName, uint8 _decimalUnits, string memory _tokenSymbol) public {
        totalSupply_ = _initialAmount;
        balances[msg.sender] = _initialAmount;
        name = _tokenName;
        symbol = _tokenSymbol;
        decimals = _decimalUnits;
        fail = true;
    }

    function setFail(bool _fail) public {
        fail = _fail;
    }

    /**
      * @dev Arbitrarily adds tokens to any account
      */
    function allocateTo(address _owner, uint256 value) public {
        balances[_owner] += value;
        totalSupply_ += value;
        emit Transfer(address(this), _owner, value);
    }

    /**
      * @dev Fail to transfer
      */
    function transfer(address to, uint256 value) public returns (bool) {
        if (fail) {
            return false;
        }

        return super.transfer(to, value);
    }

    /**
      * @dev Fail to transfer from
      */
    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        if (fail) {
            return false;
        }

        return super.transferFrom(from, to, value);
    }
}
