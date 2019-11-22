// Abstract contract for the full DSValue standard
// --
pragma solidity ^0.5.12;

contract DSValueHarness {
    bool public has;
    bytes32 public val;

    constructor(bytes32 initVal) public {
        if (initVal != 0) {
            has = true;
            val = initVal;
        }
    }

    function peek() public view returns (bytes32, bool) {
        return (val, has);
    }

    function read() public view returns (bytes32) {
        return val;
    }

    function set(bytes32 _val) public {
        val = _val;
        has = true;
    }

    function unset() public {
        has = false;
    }
}