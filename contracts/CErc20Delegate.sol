pragma solidity ^0.5.16;

import "./CErc20.sol";

/**
 * @title Compound's CErc20Delegate Contract
 * @notice CTokens which wrap an EIP-20 underlying and are delegated to
 * @author Compound
 */
contract CErc20Delegate is CDelegateInterface, CErc20 {
    /**
     * @notice Construct an empty delegate
     */
    constructor() public {}

    /**
     * @notice Called by the delegator on a delegate to initialize it for duty
     * @param data The encoded bytes data for any initialization
     */
    function _becomeImplementation(bytes memory data) public {
        // Shh -- currently unused
        data;

        // Shh -- we don't ever want this hook to be marked pure
        if (false) {
            implementation = address(0);
        }

        require(msg.sender == address(this) || hasAdminRights(), "only self or admin may call _becomeImplementation");

        // Make sure admin storage is set up correctly
        _updateLegacyOwnership();
    }

    /**
     * @notice Called by the delegator on a delegate to forfeit its responsibility
     */
    function _resignImplementation() public {
        // Shh -- we don't ever want this hook to be marked pure
        if (false) {
            implementation = address(0);
        }

        require(msg.sender == address(this) || hasAdminRights(), "only self or admin may call _resignImplementation");
    }

    /**
     * @notice updates the legacy ownership data (admin, adminHasRights, fuseAdminHasRights)
     */
    function _updateLegacyOwnership() public {
        ComptrollerV3Storage comptrollerStorage = ComptrollerV3Storage(address(comptroller));
        __admin = address(uint160(comptrollerStorage.admin()));
        __adminHasRights = comptrollerStorage.adminHasRights();
        __fuseAdminHasRights = comptrollerStorage.fuseAdminHasRights();
    }
}
