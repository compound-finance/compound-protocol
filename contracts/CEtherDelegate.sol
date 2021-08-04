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

        require(msg.sender == address(this) || hasAdminRights(), "only self or admin may call _becomeImplementation");

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

    /**
     * @dev Internal function to update the implementation of the delegator
     * @param implementation_ The address of the new implementation for delegation
     * @param allowResign Flag to indicate whether to call _resignImplementation on the old implementation
     * @param becomeImplementationData The encoded bytes data to be passed to _becomeImplementation
     */
    function __setImplementation(address implementation_, bool allowResign, bytes memory becomeImplementationData) internal {
        // Check whitelist
        require(fuseAdmin.cEtherDelegateWhitelist(implementation, implementation_, allowResign), "New implementation contract address not whitelisted or allowResign must be inverted.");

        // Delegate _resignImplementation
        if (allowResign) callSelf(abi.encodeWithSignature("_resignImplementation()"));

        // Get old implementation
        address oldImplementation = implementation;

        // Store new implementation
        implementation = implementation_;

        // Delegate _becomeImplementation
        callSelf(abi.encodeWithSignature("_becomeImplementation(bytes)", becomeImplementationData));

        // Emit event
        emit NewImplementation(oldImplementation, implementation);
    }

    /**
     * @notice Called by the admin to update the implementation of the delegator
     * @param implementation_ The address of the new implementation for delegation
     * @param allowResign Flag to indicate whether to call _resignImplementation on the old implementation
     * @param becomeImplementationData The encoded bytes data to be passed to _becomeImplementation
     */
    function _setImplementation(address implementation_, bool allowResign, bytes memory becomeImplementationData) public {
        // Check admin rights
        require(hasAdminRights(), "CEtherDelegator::_setImplementation: Caller must be admin");

        // Set implementation
        __setImplementation(implementation_, allowResign, becomeImplementationData);
    }

    /**
     * @notice Internal method to call the self
     * @dev It returns to the external caller whatever the call returns or forwards reverts
     * @param data The raw data to call
     * @return The returned bytes from the call
     */
    function callSelf(bytes memory data) internal returns (bytes memory) {
        (bool success, bytes memory returnData) = address(this).call(data);
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize)
            }
        }
        return returnData;
    }

    /**
     * @notice Function called before all delegator functions
     * @dev Checks comptroller.autoImplementation and upgrades the implementation if necessary
     */
    function _prepare() external {
        if (msg.sender != address(this) && ComptrollerV3Storage(address(comptroller)).autoImplementation()) {
            (address latestCEtherDelegate, bool allowResign, bytes memory becomeImplementationData) = fuseAdmin.latestCEtherDelegate(implementation);
            if (implementation != latestCEtherDelegate) __setImplementation(latestCEtherDelegate, allowResign, becomeImplementationData);
        }
    }
}
