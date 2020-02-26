/*
Implements `transfer` and `transferForm` with 64-bit return values, just to be
especially non-compliant and stress safe token.
.*/

pragma solidity ^0.5.16;

contract EIP20NonCompliantHarness {
    bool garbage;

    function transfer(address _to, uint256 _value) public returns (uint, uint) {
        _to;
        _value; // supress unused variable warning
        garbage = false;

        return (1, 2);
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (uint, uint) {
        _from;
        _to;
        _value; // supress unused variable warning
        garbage = false;

        return (1, 2);
    }
}
