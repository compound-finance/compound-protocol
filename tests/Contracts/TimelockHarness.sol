pragma solidity ^0.5.12;

import "../../contracts/Timelock.sol";

contract TimelockHarness is Timelock {

    uint public blockTimestamp;

    constructor(address admin_, uint delay_)
        Timelock(admin_, delay_)
        public
    {
        // solium-disable-next-line security/no-block-members
        blockTimestamp = 100;
    }

    function getBlockTimestamp() internal view returns (uint) {
        return blockTimestamp;
    }

    function harnessSetBlockTimestamp(uint newBlockTimestamp) public {
        blockTimestamp = newBlockTimestamp;
    }

    function harnessSetPendingAdmin(address pendingAdmin_) public {
        pendingAdmin = pendingAdmin_;
    }

    function harnessSetAdmin(address admin_) public {
        admin = admin_;
    }

    function harnessFastForward(uint seconds_) public {
        blockTimestamp += seconds_;
    }

}
