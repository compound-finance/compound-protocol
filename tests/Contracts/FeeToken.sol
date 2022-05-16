pragma solidity ^0.5.16;

import "./FaucetToken.sol";

/**
  * @title Fee Token
  * @author Compound
  * @notice A simple test token that charges fees on transfer. Used to mock USDT.
  */
contract FeeToken is FaucetToken {
    uint public basisPointFee;
    address public owner;

    constructor(
        uint256 _initialAmount,
        string memory _tokenName,
        uint8 _decimalUnits,
        string memory _tokenSymbol,
        uint _basisPointFee,
        address _owner
    ) FaucetToken(_initialAmount, _tokenName, _decimalUnits, _tokenSymbol) public {
        basisPointFee = _basisPointFee;
        owner = _owner;
    }

    function transfer(address dst, uint amount) public returns (bool) {
        uint fee = amount*(basisPointFee)/(10000);
        uint net = amount-(fee);
        balanceOf[owner] = balanceOf[owner]+(fee);
        balanceOf[msg.sender] = balanceOf[msg.sender]-(amount);
        balanceOf[dst] = balanceOf[dst]+(net);
        emit Transfer(msg.sender, dst, amount);
        return true;
    }

    function transferFrom(address src, address dst, uint amount) public returns (bool) {
        uint fee = amount*(basisPointFee)/(10000);
        uint net = amount-(fee);
        balanceOf[owner] = balanceOf[owner]+(fee);
        balanceOf[src] = balanceOf[src]-(amount);
        balanceOf[dst] = balanceOf[dst]+(net);
        allowance[src][msg.sender] = allowance[src][msg.sender]-(amount);
        emit Transfer(src, dst, amount);
        return true;
    }
}
