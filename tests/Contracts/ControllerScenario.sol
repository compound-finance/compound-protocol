pragma solidity ^0.5.16;

import "../../contracts/Controller.sol";

contract ControllerScenario is Controller {
    uint public blockNumber;
    address public vtxAddress;

    constructor() Controller() public {}

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

    /**
     * @notice Recalculate and update VTX speeds for all VTX markets
     */
    function refreshVtxSpeeds() public {
        VToken[] memory allMarkets_ = allMarkets;

        for (uint i = 0; i < allMarkets_.length; i++) {
            VToken vToken = allMarkets_[i];
            Exp memory borrowIndex = Exp({mantissa: vToken.borrowIndex()});
            updateVtxSupplyIndex(address(vToken));
            updateVtxBorrowIndex(address(vToken), borrowIndex);
        }

        Exp memory totalUtility = Exp({mantissa: 0});
        Exp[] memory utilities = new Exp[](allMarkets_.length);
        for (uint i = 0; i < allMarkets_.length; i++) {
            VToken vToken = allMarkets_[i];
            if (vtxSpeeds[address(vToken)] > 0) {
                Exp memory assetPrice = Exp({mantissa: oracle.getUnderlyingPrice(vToken)});
                Exp memory utility = mul_(assetPrice, vToken.totalBorrows());
                utilities[i] = utility;
                totalUtility = add_(totalUtility, utility);
            }
        }

        for (uint i = 0; i < allMarkets_.length; i++) {
            VToken vToken = allMarkets[i];
            uint newSpeed = totalUtility.mantissa > 0 ? mul_(vtxRate, div_(utilities[i], totalUtility)) : 0;
            setVtxSpeedInternal(vToken, newSpeed);
        }
    }
}
