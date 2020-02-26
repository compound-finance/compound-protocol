pragma solidity ^0.5.12;

import "../../contracts/Timelock.sol";

contract TimelockTest is Timelock {

    constructor(address admin_, uint delay_) Timelock(admin_, 2 days) public {
        delay = delay_;
    }

}