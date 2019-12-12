pragma solidity ^0.5.12;

import "./CErc20DelegateScenario.sol";

contract CErc20DelegateScenarioExtra is CErc20DelegateScenario {
    function iHaveSpoken() public pure returns (string memory) {
      return "i have spoken";
    }

    function itIsTheWay() public {
      admin = address(1); // make a change to test effect
    }

    function babyYoda() public pure {
      revert("protect the baby");
    }
}
