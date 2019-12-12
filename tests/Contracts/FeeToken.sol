pragma solidity ^0.5.12;

import "./FaucetToken.sol";
import "./SafeMath.sol";

/**
  * @title Fee Token
  * @author Compound
  * @notice A simple test token that charges fees on transfer. Used to mock USDT.
  */
contract FeeToken is FaucetToken {
    using SafeMath for uint256;

    uint public basisPointFee;
    address public owner;

    constructor(
        uint256 _initialAmount, 
        string memory _tokenName, 
        uint8 _decimalUnits, 
        string memory _tokenSymbol, 
        uint _basisPointFee,
        address _owner
    ) 
        FaucetToken(_initialAmount, _tokenName, _decimalUnits, _tokenSymbol)
        public 
    {
        basisPointFee = _basisPointFee;
        owner = _owner;
    }

    function transfer(address _to, uint _value) public returns (bool) {
        uint fee = (_value.mul(basisPointFee)).div(10000);
        balances[owner] = balances[owner].add(fee);
        balances[msg.sender] = balances[msg.sender].sub(fee);
        return super.transfer(_to, _value.sub(fee));
    }

    function transferFrom(address _from, address _to, uint _value) public returns (bool) {
        uint fee = (_value.mul(basisPointFee)).div(10000);
        balances[owner] = balances[owner].add(fee);
        balances[_from] = balances[_from].sub(fee);
        return super.transferFrom(_from, _to, _value.sub(fee));
    }
}
