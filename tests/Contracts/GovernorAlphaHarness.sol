pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import "../../contracts/Governance/GovernorAlpha.sol";

contract GovernorAlphaHarness is GovernorAlpha {
    constructor(address timelock_, address vtx_, address guardian_) GovernorAlpha(timelock_, vtx_, guardian_) public {}

    function votingPeriod() public pure returns (uint) { return 240; }
}
