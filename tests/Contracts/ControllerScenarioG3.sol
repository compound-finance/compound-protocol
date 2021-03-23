pragma solidity ^0.5.16;

import "../../contracts/ControllerG3.sol";

contract ControllerScenarioG3 is ControllerG3 {
    uint public blockNumber;
    address public vtxAddress;

    constructor() ControllerG3() public {}

    function setVtxAddress(address vtxAddress_) public {
        vtxAddress = vtxAddress_;
    }

    function getVtxAddress() public view returns (address) {
        return vtxAddress;
    }

    function membershipLength(VToken vToken) public view returns (uint) {
        return accountAssets[address(vToken)].length;
    }

    function fastForward(uint blocks) public returns (uint) {
        blockNumber += blocks;

        return blockNumber;
    }

    function setBlockNumber(uint number) public {
        blockNumber = number;
    }

    function getBlockNumber() public view returns (uint) {
        return blockNumber;
    }

    function getVtxMarkets() public view returns (address[] memory) {
        uint m = allMarkets.length;
        uint n = 0;
        for (uint i = 0; i < m; i++) {
            if (markets[address(allMarkets[i])].isVtxed) {
                n++;
            }
        }

        address[] memory vtxMarkets = new address[](n);
        uint k = 0;
        for (uint i = 0; i < m; i++) {
            if (markets[address(allMarkets[i])].isVtxed) {
                vtxMarkets[k++] = address(allMarkets[i]);
            }
        }
        return vtxMarkets;
    }

    function unlist(VToken vToken) public {
        markets[address(vToken)].isListed = false;
    }
}
