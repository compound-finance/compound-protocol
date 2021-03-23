pragma solidity ^0.5.16;

import "../../contracts/ControllerG2.sol";

contract ControllerScenarioG2 is ControllerG2 {
    uint public blockNumber;
    address public vtxAddress;

    constructor() ControllerG2() public {}

    function fastForward(uint blocks) public returns (uint) {
        blockNumber += blocks;
        return blockNumber;
    }

    function setBlockNumber(uint number) public {
        blockNumber = number;
    }
}
