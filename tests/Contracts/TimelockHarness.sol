pragma solidity ^0.5.12;

import "../../contracts/Timelock.sol";

contract TimelockHarness is Timelock {

    constructor(address admin_, uint delay_)
        Timelock(admin_, delay_)
        public
    {
    }

    function harnessSetPendingAdmin(address pendingAdmin_) public {
        pendingAdmin = pendingAdmin_;
    }

    function harnessSetAdmin(address admin_) public {
        admin = admin_;
    }

}
