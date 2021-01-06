pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import "../../contracts/Governance/GovernorBravoDelegate.sol";

contract GovernorBravoDelegateHarness is GovernorBravoDelegate {
	// Become Compound Governor
    function _become() public {
        proposalCount = 1;
        initalProposalId = 1;
    }
}