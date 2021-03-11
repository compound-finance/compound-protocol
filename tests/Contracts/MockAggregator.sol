pragma solidity ^0.5.16;

import "../../contracts/AggregatorInterface.sol";

contract MockAggregatorV3 is AggregatorInterface {

    int256 public answer;

    function latestAnswer() external view returns (int256) {
        return answer;
    }

	function latestTimestamp() external view returns (uint256) {return 1;}
	function latestRound() external view returns (uint256) {return 1;}
	function getAnswer(uint256) external view returns (int256) {return 1;}
	function getTimestamp(uint256) external view returns (uint256) {return 1;}

    function setAnswer(int256 newAnswer) external {
        answer = newAnswer;
    }
}
