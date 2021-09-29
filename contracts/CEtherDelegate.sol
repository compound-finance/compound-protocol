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
    function _becomeImplementation(bytes calldata data) external {
        // Shh -- currently unused
        data;

        // Shh -- we don't ever want this hook to be marked pure
        if (false) {
            implementation = address(0);
        }

        require(msg.sender == address(this) || hasAdminRights(), "only self or admin may call _becomeImplementation");

        // Make sure admin storage is set up correctly
        __admin = address(0);
        __adminHasRights = false;
        __fuseAdminHasRights = false;
    }

    /**
     * @notice Called by the delegator on a delegate to forfeit its responsibility
     */
    function _resignImplementation() internal {
        // Shh -- we don't ever want this hook to be marked pure
        if (false) {
            implementation = address(0);
        }
    }

    /**
     * @dev Internal function to update the implementation of the delegator
     * @param implementation_ The address of the new implementation for delegation
     * @param allowResign Flag to indicate whether to call _resignImplementation on the old implementation
     * @param becomeImplementationData The encoded bytes data to be passed to _becomeImplementation
     */
    function _setImplementationInternal(address implementation_, bool allowResign, bytes memory becomeImplementationData) internal {
        // Check whitelist
        require(fuseAdmin.cEtherDelegateWhitelist(implementation, implementation_, allowResign), "new implementation not whitelisted or allowResign must be inverted");

        // Call _resignImplementation internally (this delegate's code)
        if (allowResign) _resignImplementation();

        // Get old implementation
        address oldImplementation = implementation;

        // Store new implementation
        implementation = implementation_;

        // Call _becomeImplementation externally (delegating to new delegate's code)
        _functionCall(address(this), abi.encodeWithSignature("_becomeImplementation(bytes)", becomeImplementationData), "reverted on _becomeImplementation");

        // Emit event
        emit NewImplementation(oldImplementation, implementation);
    }

    /**
     * @notice Called by the admin to update the implementation of the delegator
     * @param implementation_ The address of the new implementation for delegation
     * @param allowResign Flag to indicate whether to call _resignImplementation on the old implementation
     * @param becomeImplementationData The encoded bytes data to be passed to _becomeImplementation
     */
    function _setImplementationSafe(address implementation_, bool allowResign, bytes calldata becomeImplementationData) external {
        // Check admin rights
        require(hasAdminRights(), "only admin may call _setImplementationSafe");

        // Set implementation
        _setImplementationInternal(implementation_, allowResign, becomeImplementationData);
    }

    /**
     * @notice Function called before all delegator functions
     * @dev Checks comptroller.autoImplementation and upgrades the implementation if necessary
     */
    function _prepare() external payable {
        if (msg.sender != address(this) && ComptrollerV3Storage(address(comptroller)).autoImplementation()) {
            (address latestCEtherDelegate, bool allowResign, bytes memory becomeImplementationData) = fuseAdmin.latestCEtherDelegate(implementation);
            if (implementation != latestCEtherDelegate) _setImplementationInternal(latestCEtherDelegate, allowResign, becomeImplementationData);
        }
    }
}
