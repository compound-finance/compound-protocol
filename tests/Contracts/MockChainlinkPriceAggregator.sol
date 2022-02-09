pragma solidity ^0.5.16;

import "../../contracts/CToken.sol";
import "../../contracts/interfaces/IChainlinkAggregator.sol";

contract MockChainlinkPriceAggregator is IChainlinkAggregator {
    int256 private answer;
    uint8 public decimals;

    constructor(uint8 decimals_, int256 answer_) public {
        decimals = decimals_;
        answer = answer_;
    }

    function _setAnswer(int256 answer_) external {
        answer = answer_;
    }

    function getRoundData(uint80 roundId_) external view returns (
      uint80,
      int256,
      uint256,
      uint256,
      uint80
    ) {
        return (roundId_, answer, 0, 0, 0);
    }

    function latestRoundData() external view returns (
      uint80,
      int256,
      uint256,
      uint256,
      uint80
    ) {
        return this.getRoundData(0);
    }
}