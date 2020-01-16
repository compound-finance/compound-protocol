pragma solidity ^0.5.12;

import "../../../contracts/Governance/Comp.sol";

contract CompCertora is Comp {
    constructor(address grantor) Comp(grantor) public {}

    function certoraOrdered(address account) external returns (bool) {
        uint32 nCheckpoints = numCheckpoints[account];
        for (uint32 i = 1; i < nCheckpoints; i++) {
            if (checkpoints[account][i - 1].fromBlock >= checkpoints[account][i].fromBlock) {
                return false;
            }
        }

        Checkpoint storage last = checkpoints[account][nCheckpoints - 1];
        if (nCheckpoints == 0) {
            // we rely on 0 initialization when there are no checkpoints
            if (last.fromBlock != 0 || last.votes != 0) {
                return false;
            }
        } else {
            // otherwise make sure the last checkpoint is not past the current block
            if (checkpoints[account][nCheckpoints - 1].fromBlock > block.number) {
                return false;
            }
        }

        return true;
    }

    function certoraScan(address account, uint blockNumber) external returns (uint) {
        // find most recent checkpoint from before blockNumber
        for (uint32 i = numCheckpoints[account]; i != 0; i--) {
            Checkpoint memory cp = checkpoints[account][i-1];
            if (cp.fromBlock <= blockNumber) {
                return cp.votes;
            }
        }

        // blockNumber is from before first checkpoint (or list is empty)
        return 0;
    }
}
