pragma solidity ^0.5.8;

import "../Timelock.sol";

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

    function harnessFastForward(uint seconds_) public {
        blockTimestamp += seconds_;
    }

}
