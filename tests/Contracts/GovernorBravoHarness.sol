pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import "../../contracts/Governance/GovernorBravoDelegate.sol";

contract GovernorBravoDelegateHarness is GovernorBravoDelegate {
	// @notice Harness initiate the GovenorBravo contract
	// @dev This function bypasses the need to initiate the GovernorBravo contract from an existing GovernorAlpha for testing.
	// Actual use will only use the _initiate(address) function
    function _initiate() public {
        proposalCount = 1;
        initialProposalId = 1;
    }
}