pragma solidity ^0.5.16;

interface ComptrollerInterface {
    function claimComp(
        address holder,
        uint256 compSpeed,
        bytes32[] calldata proof
    ) external;

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
     * @param compSpeed The speed of COMP claim
     * @param proof The merkle tree proof
     * @param comptrollers The Comptrollers to claim the COMP from
     */
    function claimComp(
        ComptrollerInterface[] memory comptrollers,
        address holder,
        uint256 compSpeed,
        bytes32[] memory proof
    ) public {
        comptrollers[0].claimComp(holder, compSpeed, proof);

        for (uint256 i = 1; i < comptrollers.length; i++) {
            comptrollers[i].claimComp(holder);
        }
    }

    /**
     * @notice Claim all the comp accrued by holder in comptrollers
     * @param holder The address to claim COMP for
     * @param comptrollers The Comptrollers to claim the COMP from
     */
    function claimComp(
        ComptrollerInterface[] memory comptrollers,
        address holder
    ) public {
        for (uint256 i = 0; i < comptrollers.length; i++) {
            comptrollers[i].claimComp(holder);
        }
    }
}
