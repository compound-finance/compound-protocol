pragma solidity ^0.5.12;

import "./ERC20BasicNS.sol";

/**
 * @title ERC20 interface (non-standard)
 * @dev Version of ERC20 with no return values for `transfer` and `transferFrom`
 * See https://medium.com/coinmonks/missing-return-value-bug-at-least-130-tokens-affected-d67bf08521ca
 */
contract ERC20NS is ERC20BasicNS {
    function allowance(address owner, address spender) public view returns (uint256);
    function transferFrom(address from, address to, uint256 value) public;
    function approve(address spender, uint256 value) public returns (bool);

    event Approval(address indexed owner, address indexed spender, uint256 value);
}