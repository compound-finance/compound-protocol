pragma solidity ^0.5.16;

import "../../contracts/ControllerG6.sol";

contract ControllerScenarioG6 is ControllerG6 {
    uint public blockNumber;
    address public vtxAddress;

    constructor() ControllerG6() public {}

    function fastForward(uint blocks) public returns (uint) {
        blockNumber += blocks;
        return blockNumber;
    }

    function setVtxAddress(address vtxAddress_) public {
        vtxAddress = vtxAddress_;
    }

    function getVtxAddress() public view returns (address) {
        return vtxAddress;
    }

    function setBlockNumber(uint number) public {
        blockNumber = number;
    }

    function getBlockNumber() public view returns (uint) {
        return blockNumber;
    }

    function membershipLength(VToken vToken) public view returns (uint) {
        return accountAssets[address(vToken)].length;
    }

    function unlist(VToken vToken) public {
        markets[address(vToken)].isListed = false;
    }

    function setVtxSpeed(address vToken, uint vtxSpeed) public {
        vtxSpeeds[vToken] = vtxSpeed;
    }
}
