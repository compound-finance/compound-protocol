pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import "../../contracts/Governance/GovernorBravoDelegate.sol";

contract GovernorBravoImmutable is GovernorBravoDelegate {

     constructor(
            address timelock_,
            address comp_,
            address admin_,
            uint256 votingPeriod_,
            uint256 votingDelay_) public {
       initialize(timelock_, comp_, admin_, votingPeriod_, votingDelay_);
    }

    function _initiate() public {
        proposalCount = 1;
        initalProposalId = 1;
    }
}
