// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

import "../../contracts/Comptroller.sol";

contract ComptrollerScenario is Comptroller {
    uint public blockNumber;
    address public compAddress;

    constructor() Comptroller() {}

    function fastForward(uint blocks) public returns (uint) {
        blockNumber += blocks;
        return blockNumber;
    }

    function setCompAddress(address compAddress_) public {
        compAddress = compAddress_;
    }

    function getCompAddress() override public view returns (address) {
        return compAddress;
    }

    function setBlockNumber(uint number) public {
        blockNumber = number;
    }

    function getBlockNumber() override public view returns (uint) {
        return blockNumber;
    }

    function membershipLength(XToken cToken) public view returns (uint) {
        return accountAssets[address(cToken)].length;
    }

    function unlist(XToken cToken) public {
        markets[address(cToken)].isListed = false;
    }

    function setCompBorrowerIndex(address cToken, address borrower, uint index) public {
        compBorrowerIndex[cToken][borrower] = index;
    }

    function setCompSupplierIndex(address cToken, address supplier, uint index) public {
        compSupplierIndex[cToken][supplier] = index;
    }

    /**
     * @notice Recalculate and update COMP speeds for all COMP markets
     */
    function refreshCompSpeeds() public {
        XToken[] memory allMarkets_ = allMarkets;

        for (uint i = 0; i < allMarkets_.length; i++) {
            XToken cToken = allMarkets_[i];
            Exp memory borrowIndex = Exp({mantissa: cToken.borrowIndex()});
            updateCompSupplyIndex(address(cToken));
            updateCompBorrowIndex(address(cToken), borrowIndex);
        }

        Exp memory totalUtility = Exp({mantissa: 0});
        Exp[] memory utilities = new Exp[](allMarkets_.length);
        for (uint i = 0; i < allMarkets_.length; i++) {
            XToken cToken = allMarkets_[i];
            if (compSupplySpeeds[address(cToken)] > 0 || compBorrowSpeeds[address(cToken)] > 0) {
                Exp memory assetPrice = Exp({mantissa: oracle.getUnderlyingPrice(cToken)});
                Exp memory utility = mul_(assetPrice, cToken.totalBorrows());
                utilities[i] = utility;
                totalUtility = add_(totalUtility, utility);
            }
        }

        for (uint i = 0; i < allMarkets_.length; i++) {
            XToken cToken = allMarkets[i];
            uint newSpeed = totalUtility.mantissa > 0 ? mul_(compRate, div_(utilities[i], totalUtility)) : 0;
            setCompSpeedInternal(cToken, newSpeed, newSpeed);
        }
    }
}
