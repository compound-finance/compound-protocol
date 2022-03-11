pragma solidity ^0.5.16;

import "../../contracts/ComptrollerG4.sol";
import "../../contracts/CTokenInterface.sol";

contract ComptrollerScenarioG4 is ComptrollerG4 {
    uint public blockNumber;
    address public compAddress;

    constructor() ComptrollerG4() public {}

    function fastForward(uint blocks) public returns (uint) {
        blockNumber += blocks;
        return blockNumber;
    }

    function setBlockNumber(uint number) public {
        blockNumber = number;
    }

    function membershipLength(CTokenInterface cToken) public view returns (uint) {
        return accountAssets[address(cToken)].length;
    }

    function unlist(CTokenInterface cToken) public {
        markets[address(cToken)].isListed = false;
    }
}
