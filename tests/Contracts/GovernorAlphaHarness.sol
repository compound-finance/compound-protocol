// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

import "../../contracts/Governance/GovernorAlpha.sol";

contract GovernorAlphaHarness is GovernorAlpha {
    constructor(address timelock_, address comp_, address guardian_) GovernorAlpha(timelock_, comp_, guardian_) {}

    function votingPeriod() public override pure returns (uint) { return 240; }
}
