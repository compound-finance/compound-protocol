pragma solidity ^0.5.12;

import "../../../contracts/Governance/Comp.sol";

contract CompCertora is Comp {
    address account;

    constructor(address grantor) Comp(grantor) public {}

    function certoraOrdered() external returns (bool) {
        bool ans = true;
        for (uint i = 1; i < checkpoints[account].length; i++) {
            ans = ans && checkpoints[account][i-1].fromBlock < checkpoints[account][i].fromBlock;
        }
        return ans;
    }

    function certoraScan(uint blockNumber) external returns (uint) {
        uint length = checkpoints[account].length;

        // find most recent checkpoint from before blockNumber
        for (uint i = length; i != 0; i--) {
            Checkpoint memory cp = checkpoints[account][i-1];
            if (cp.fromBlock <= blockNumber) {
                return cp.votes;
            }
        }

        // blockNumber is from before first checkpoint (or list is empty)
        return 0;
    }

    function certoraNCheckpoints() external returns (uint) {
        return checkpoints[account].length;
    }

    function certoraGetPriorVotes(uint blockNumber) external returns (uint) {
        return getPriorVotes(account, blockNumber);
    }
}
