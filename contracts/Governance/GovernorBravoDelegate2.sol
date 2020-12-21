pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import "./GovernorBravoInterfaces.sol";

contract GovernorBravo is GovernorBravoStorageV1 {
    /// @notice The name of this contract
    string public constant name = "Compound Governor Bravo";

    /// @notice The number of votes in support of a proposal required in order for a quorum to be reached and for a vote to succeed
    function quorumVotes() public pure returns (uint) { return 400000e18; } // 400,000 = 4% of Comp

    /// @notice The number of votes required in order for a voter to become a proposer
    function proposalThreshold() public pure returns (uint) { return 100000e18; } // 100,000 = 1% of Comp

    /// @notice The maximum number of actions that can be included in a proposal
    function proposalMaxOperations() public pure returns (uint) { return 10; } // 10 actions

    /// @notice The EIP-712 typehash for the contract's domain
    bytes32 public constant DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,uint256 chainId,address verifyingContract)");

    /// @notice The EIP-712 typehash for the ballot struct used by the contract
    bytes32 public constant BALLOT_TYPEHASH = keccak256("Ballot(uint256 proposalId,uint support,string reason)");

    constructor(address timelock_, address comp_, uint256 votingPeriod_, uint256 votingDelay_) public {
        timelock = TimelockInterface(timelock_);
        comp = CompInterface(comp_);
        votingPeriod = votingPeriod_;
        votingDelay = votingDelay_;
    }

    function propose(address[] memory targets, uint[] memory values, string[] memory signatures, bytes[] memory calldatas, string memory description) public returns (uint) {
        // Reject proposals before becoming Governor
        require(initalProposalId != 0, "GovernorBravo::propose: Governor Bravo not active");
        require(comp.getPriorVotes(msg.sender, sub256(block.number, 1)) > proposalThreshold(), "GovernorBravo::propose: proposer votes below proposal threshold");
        require(targets.length == values.length && targets.length == signatures.length && targets.length == calldatas.length, "GovernorBravo::propose: proposal function information arity mismatch");
        require(targets.length != 0, "GovernorBravo::propose: must provide actions");
        require(targets.length <= proposalMaxOperations(), "GovernorBravo::propose: too many actions");

        uint latestProposalId = latestProposalIds[msg.sender];
        if (latestProposalId != 0) {
          ProposalState proposersLatestProposalState = state(latestProposalId);
          require(proposersLatestProposalState != ProposalState.Active, "GovernorBravo::propose: one live proposal per proposer, found an already active proposal");
          require(proposersLatestProposalState != ProposalState.Pending, "GovernorBravo::propose: one live proposal per proposer, found an already pending proposal");
        }

        uint startBlock = add256(block.number, votingDelay);
        uint endBlock = add256(startBlock, votingPeriod);

        proposalCount++;
        Proposal memory newProposal = Proposal({
            id: proposalCount,
            proposer: msg.sender,
            eta: 0,
            targets: targets,
            values: values,
            signatures: signatures,
            calldatas: calldatas,
            startBlock: startBlock,
            endBlock: endBlock,
            forVotes: 0,
            againstVotes: 0,
            abstainVotes: 0,
            canceled: false,
            executed: false
        });

        proposals[newProposal.id] = newProposal;
        latestProposalIds[newProposal.proposer] = newProposal.id;

        emit ProposalCreated(newProposal.id, msg.sender, targets, values, signatures, calldatas, startBlock, endBlock, description);
        return newProposal.id;
    }

    function queue(uint proposalId) public {
        require(state(proposalId) == ProposalState.Succeeded, "GovernorBravo::queue: proposal can only be queued if it is succeeded");
        Proposal storage proposal = proposals[proposalId];
        uint eta = add256(block.timestamp, timelock.delay());
        for (uint i = 0; i < proposal.targets.length; i++) {
            _queueOrRevert(proposal.targets[i], proposal.values[i], proposal.signatures[i], proposal.calldatas[i], eta);
        }
        proposal.eta = eta;
        emit ProposalQueued(proposalId, eta);
    }

    function _queueOrRevert(address target, uint value, string memory signature, bytes memory data, uint eta) internal {
        require(!timelock.queuedTransactions(keccak256(abi.encode(target, value, signature, data, eta))), "GovernorBravo::_queueOrRevert: proposal action already queued at eta");
        timelock.queueTransaction(target, value, signature, data, eta);
    }

    function execute(uint proposalId) public payable {
        require(state(proposalId) == ProposalState.Queued, "GovernorBravo::execute: proposal can only be executed if it is queued");
        Proposal storage proposal = proposals[proposalId];
        proposal.executed = true;
        for (uint i = 0; i < proposal.targets.length; i++) {
            timelock.executeTransaction.value(proposal.values[i])(proposal.targets[i], proposal.values[i], proposal.signatures[i], proposal.calldatas[i], proposal.eta);
        }
        emit ProposalExecuted(proposalId);
    }

    function cancel(uint proposalId) public {
        ProposalState state = state(proposalId);
        require(state != ProposalState.Executed, "GovernorBravo::cancel: cannot cancel executed proposal");

        Proposal storage proposal = proposals[proposalId];
        require(msg.sender == proposal.proposer || comp.getPriorVotes(proposal.proposer, sub256(block.number, 1)) < proposalThreshold(), "GovernorBravo::cancel: proposer above threshold");

        proposal.canceled = true;
        for (uint i = 0; i < proposal.targets.length; i++) {
            timelock.cancelTransaction(proposal.targets[i], proposal.values[i], proposal.signatures[i], proposal.calldatas[i], proposal.eta);
        }

        emit ProposalCanceled(proposalId);
    }

    function getActions(uint proposalId) public view returns (address[] memory targets, uint[] memory values, string[] memory signatures, bytes[] memory calldatas) {
        Proposal storage p = proposals[proposalId];
        return (p.targets, p.values, p.signatures, p.calldatas);
    }

    function getReceipt(uint proposalId, address voter) public view returns (Receipt memory) {
        return proposals[proposalId].receipts[voter];
    }

    function state(uint proposalId) public view returns (ProposalState) {
        require(proposalCount >= proposalId && proposalId > initalProposalId, "GovernorBravo::state: invalid proposal id");
        Proposal storage proposal = proposals[proposalId];
        if (proposal.canceled) {
            return ProposalState.Canceled;
        } else if (block.number <= proposal.startBlock) {
            return ProposalState.Pending;
        } else if (block.number <= proposal.endBlock) {
            return ProposalState.Active;
        } else if (proposal.forVotes <= proposal.againstVotes || proposal.forVotes < quorumVotes()) {
            return ProposalState.Defeated;
        } else if (proposal.eta == 0) {
            return ProposalState.Succeeded;
        } else if (proposal.executed) {
            return ProposalState.Executed;
        } else if (block.timestamp >= add256(proposal.eta, timelock.GRACE_PERIOD())) {
            return ProposalState.Expired;
        } else {
            return ProposalState.Queued;
        }
    }

    function castVote(uint proposalId, uint support, string calldata reason) external {
        return _castVote(msg.sender, proposalId, support, reason);
    }

    function castVoteBySig(uint proposalId, uint support, string calldata reason, uint8 v, bytes32 r, bytes32 s) external {
        bytes32 domainSeparator = keccak256(abi.encode(DOMAIN_TYPEHASH, keccak256(bytes(name)), getChainId(), address(this)));
        bytes32 structHash = keccak256(abi.encode(BALLOT_TYPEHASH, proposalId, support, reason));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        address signatory = ecrecover(digest, v, r, s);
        require(signatory != address(0), "GovernorBravo::castVoteBySig: invalid signature");
        return _castVote(signatory, proposalId, support, reason);
    }

    function _castVote(address voter, uint proposalId, uint support, string memory reason) internal {
        require(state(proposalId) == ProposalState.Active, "GovernorBravo::_castVote: voting is closed");
        require(support <= 2, "GovernorBravo::_castVote: invalid vote type");
        Proposal storage proposal = proposals[proposalId];
        Receipt storage receipt = proposal.receipts[voter];
        require(receipt.hasVoted == false, "GovernorBravo::_castVote: voter already voted");
        uint96 votes = comp.getPriorVotes(voter, proposal.startBlock);

        if (support == 0) {
            proposal.againstVotes = add256(proposal.againstVotes, votes);
        } else if (support == 1) {
            proposal.forVotes = add256(proposal.forVotes, votes);
        } else if (support == 2) {
            proposal.abstainVotes = add256(proposal.abstainVotes, votes);
        }

        receipt.hasVoted = true;
        receipt.support = support;
        receipt.votes = votes;
        receipt.reason = reason;

        emit VoteCast(voter, proposalId, support, votes, reason);
    }

    function _setVotingDelay(uint newVotingDelay) external {
        require(msg.sender == admin);
        uint oldVotingDelay = votingDelay;
        votingDelay = newVotingDelay;

        emit VotingDelaySet(oldVotingDelay,votingDelay);
    }

    function _setVotingPeriod(uint newVotingPeriod) external {
        require(msg.sender == admin);
        uint oldVotingPeriod = votingPeriod;
        votingPeriod = newVotingPeriod;

        emit VotingPeriodSet(oldVotingPeriod, votingPeriod);
    }

    // Become Compound Governor
    function _become(address governorAlpha) public {
        require(msg.sender == admin);
        proposalCount = GovernorAlpha(governorAlpha).proposalCount();
        initalProposalId = proposalCount;
        timelock.acceptAdmin();
    }

    function add256(uint256 a, uint256 b) internal pure returns (uint) {
        uint c = a + b;
        require(c >= a, "addition overflow");
        return c;
    }

    function sub256(uint256 a, uint256 b) internal pure returns (uint) {
        require(b <= a, "subtraction underflow");
        return a - b;
    }

    function getChainId() internal pure returns (uint) {
        uint chainId;
        assembly { chainId := chainid() }
        return chainId;
    }
}

interface GovernorAlpha {
    /// @notice The total number of proposals
    function proposalCount() external returns (uint); 
}
