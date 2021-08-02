pragma solidity ^0.5.16;

import "./CEther.sol";

/**
 * @title Compound's CEtherDelegate Contract
 * @notice CTokens which wrap Ether and are delegated to
 * @author Compound
 */
contract CEtherDelegate is CDelegateInterface, CEther {
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

        require(msg.sender == address(this), "only self may call _becomeImplementation");

        // Make sure legacy admin storage is set up correctly
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

        require(msg.sender == address(this), "only self may call _resignImplementation");
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
