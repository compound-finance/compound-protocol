pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import "../../contracts/Governance/GovernorBravoDelegate.sol";

contract GovernorBravoImmutable is GovernorBravoDelegate {

     constructor(
            address timelock_,
            address comp_,
            address admin_,
            uint votingPeriod_,
            uint votingDelay_,
            uint proposalThreshold_) public {
       initialize(timelock_, comp_, admin_, votingPeriod_, votingDelay_, proposalThreshold_);
    }

    function _initiate() public {
        proposalCount = 1;
        initalProposalId = 1;
    }
}
