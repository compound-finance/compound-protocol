pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import "GovernorAlpha.sol";

contract QuadraticGovernorAlpha is GovernorAlpha {
    /// @notice The name of this contract
    string public constant name = "Quadratic Governor Alpha";

    function sqrt(uint y) internal pure returns (uint z) {
        if (y > 3) {
            z = y;
            uint x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function _castVote(address voter, uint proposalId, bool support) internal {
        /* insert POH code */
        IProofOfHumanity POH = IProofOfHumanity(0xc5e9ddebb09cd64dfacab4011a0d5cedaf7c9bdb)
        require (POH.isRegistered(voter), "Voter must be registered on POH")
        /* end POH code */

        require(state(proposalId) == ProposalState.Active, "GovernorAlpha::_castVote: voting is closed");
        Proposal storage proposal = proposals[proposalId];
        Receipt storage receipt = proposal.receipts[voter];
        require(receipt.hasVoted == false, "GovernorAlpha::_castVote: voter already voted");
        uint96 votes = comp.getPriorVotes(voter, proposal.startBlock);
        /* insert quadratic votes */
        votes = sqrt(votes)
        /* end quadratic votes */

        if (support) {
            proposal.forVotes = add256(proposal.forVotes, votes);
        } else {
            proposal.againstVotes = add256(proposal.againstVotes, votes);
        }

        receipt.hasVoted = true;
        receipt.support = support;
        receipt.votes = votes;

        emit VoteCast(voter, proposalId, support, votes);
    }

}
