pragma solidity ^0.5.16;

import "../../contracts/ControllerG4.sol";

contract ControllerScenarioG4 is ControllerG4 {
    uint public blockNumber;
    address public vtxAddress;

    constructor() ControllerG4() public {}

    function fastForward(uint blocks) public returns (uint) {
        blockNumber += blocks;
        return blockNumber;
    }

    function setBlockNumber(uint number) public {
        blockNumber = number;
    }

    function membershipLength(VToken vToken) public view returns (uint) {
        return accountAssets[address(vToken)].length;
    }

    function unlist(VToken vToken) public {
        markets[address(vToken)].isListed = false;
    }
}
