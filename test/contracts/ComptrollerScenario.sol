pragma solidity ^0.5.12;

import "../Comptroller.sol";
import "../PriceOracle.sol";

contract ComptrollerScenario is Comptroller {
    uint public blockNumber;

    constructor() Comptroller() public {}

    function membershipLength(CToken cToken) public view returns (uint) {
        return accountAssets[address(cToken)].length;
    }

    function fastForward(uint blocks) public returns (uint) {
        blockNumber += blocks;

        return blockNumber;
    }

    function setBlockNumber(uint number) public {
        blockNumber = number;
    }

    function _become(Unitroller unitroller) public {
        super._become(unitroller);
    }

    function getHypotheticalAccountLiquidity(
        address account,
        address cTokenModify,
        uint redeemTokens,
        uint borrowAmount) public view returns (uint, uint, uint) {
        (Error err, uint liquidity, uint shortfall) =
            super.getHypotheticalAccountLiquidityInternal(account, CToken(cTokenModify), redeemTokens, borrowAmount);
        return (uint(err), liquidity, shortfall);
    }

    function unlist(CToken cToken) public {
        markets[address(cToken)].isListed = false;
    }
}
