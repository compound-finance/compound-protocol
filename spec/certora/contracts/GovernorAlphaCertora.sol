pragma solidity ^0.5.12;
pragma experimental ABIEncoderV2;

import "../../../contracts/Governance/GovernorAlpha.sol";

contract GovernorAlphaCertora is GovernorAlpha {
    Proposal proposal;

    constructor(address timelock_, address comp_, address guardian_) GovernorAlpha(timelock_, comp_, guardian_) public {}

    function certoraPropose() public returns (uint) {
        // XXX certora can't compile Gov yet (string[])
        return propose(proposal.targets, proposal.values, proposal.signatures, proposal.calldatas, "Motion to do something");
    }

    function certoraProposalStart(uint proposalId) public returns (uint) {
        return proposals[proposalId].startBlock;
    }

    function certoraProposalEnd(uint proposalId) public returns (uint) {
        return proposals[proposalId].endBlock;
    }

    function certoraProposalState(uint proposalId) public returns (uint) {
        return uint(state(proposalId));
    }
}
