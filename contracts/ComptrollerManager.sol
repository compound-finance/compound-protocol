pragma solidity ^0.5.16;

interface ComptrollerInterface {
    function claimComp(address holder) external;
}

/**
 * @title Citrus's ComptrollerManager Contract
 * @author Citrus
 */
contract ComptrollerManager {
    /**
     * @notice Claim all the comp accrued by holder in comptrollers
     * @param holder The address to claim COMP for
     * @param comptrollers The Comptrollers to claim the COMP from
     */
    function claimComp(address holder, ComptrollerInterface[] memory comptrollers) public {
        for (uint i = 0; i < comptrollers.length; i++) {
            comptrollers[i].claimComp(holder);
        }
    }
}