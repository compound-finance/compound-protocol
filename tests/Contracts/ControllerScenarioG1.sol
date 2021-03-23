pragma solidity ^0.5.16;

import "../../contracts/ControllerG1.sol";
import "../../contracts/PriceOracle.sol";

// XXX we should delete G1 everything...
//  requires fork/deploy bytecode tests

contract ControllerScenarioG1 is ControllerG1 {
    uint public blockNumber;

    constructor() ControllerG1() public {}

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

    function _become(
        Unitroller unitroller,
        PriceOracle _oracle,
        uint _closeFactorMantissa,
        uint _maxAssets,
        bool reinitializing) public {
        super._become(unitroller, _oracle, _closeFactorMantissa, _maxAssets, reinitializing);
    }

    function getHypotheticalAccountLiquidity(
        address account,
        address vTokenModify,
        uint redeemTokens,
        uint borrowAmount) public view returns (uint, uint, uint) {
        (Error err, uint liquidity, uint shortfall) =
            super.getHypotheticalAccountLiquidityInternal(account, VToken(vTokenModify), redeemTokens, borrowAmount);
        return (uint(err), liquidity, shortfall);
    }

    function unlist(VToken vToken) public {
        markets[address(vToken)].isListed = false;
    }
}
