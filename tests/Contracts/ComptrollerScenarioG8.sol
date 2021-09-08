pragma solidity ^0.5.16;

import "../../contracts/ComptrollerG8.sol";

contract ComptrollerScenarioG8 is ComptrollerG8 {
    uint public blockNumber;
    address public compAddress;

    constructor() ComptrollerG8() public {}

    function fastForward(uint blocks) public returns (uint) {
        blockNumber += blocks;
        return blockNumber;
    }

    function setCompAddress(address compAddress_) public {
        compAddress = compAddress_;
    }

    function getCompAddress() public view returns (address) {
        return compAddress;
    }

    function setBlockNumber(uint number) public {
        blockNumber = number;
    }

    function getBlockNumber() public view returns (uint) {
        return blockNumber;
    }

    function membershipLength(CToken cToken) public view returns (uint) {
        return accountAssets[address(cToken)].length;
    }

    function unlist(CToken cToken) public {
        markets[address(cToken)].isListed = false;
    }

    function setCompSpeed(address cToken, uint compSpeed) public {
        compSpeeds[cToken] = compSpeed;
    }
}
