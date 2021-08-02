pragma solidity ^0.5.16;

import "./CTokenInterfaces.sol";
import "./ComptrollerStorage.sol";

/**
 * @title Compound's CEtherDelegator Contract
 * @notice CTokens which wrap Ether and delegate to an implementation
 * @author Compound
 */
contract CEtherDelegator is CDelegatorInterface, CTokenAdminStorage {
    /**
     * @notice Returns a boolean indicating if the sender has admin rights
     */
    function hasAdminRights() internal view returns (bool) {
        (bool success, bytes memory data) = implementation.staticcall(abi.encodeWithSignature("comptroller()"));
        require(success);
        address ct = abi.decode(data, (address));
        ComptrollerV3Storage comptroller = ComptrollerV3Storage(ct);
        return (msg.sender == comptroller.admin() && comptroller.adminHasRights()) || (msg.sender == address(fuseAdmin) && comptroller.fuseAdminHasRights());
    }

    /**
     * @notice Construct a new CEther money market
     * @param comptroller_ The address of the Comptroller
     * @param interestRateModel_ The address of the interest rate model
     * @param name_ ERC-20 name of this token
     * @param symbol_ ERC-20 symbol of this token
     * @param implementation_ The address of the implementation the contract delegates to
     * @param becomeImplementationData The encoded args for becomeImplementation
     */
    constructor(ComptrollerInterface comptroller_,
                InterestRateModel interestRateModel_,
                string memory name_,
                string memory symbol_,
                address implementation_,
                bytes memory becomeImplementationData,
                uint256 reserveFactorMantissa_,
                uint256 adminFeeMantissa_) public {
        // First delegate gets to initialize the delegator (i.e. storage contract)
        delegateTo(implementation_, abi.encodeWithSignature("initialize(address,address,string,string,uint256,uint256)",
                                                            comptroller_,
                                                            interestRateModel_,
                                                            name_,
                                                            symbol_,
                                                            reserveFactorMantissa_,
                                                            adminFeeMantissa_));

        // New implementations always get set via the settor (post-initialize)
        __setImplementation(implementation_, false, becomeImplementationData);
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
        if (allowResign) delegateToImplementation(abi.encodeWithSignature("_resignImplementation()"));

        // Get old implementation
        address oldImplementation = implementation;

        // Store new implementation
        implementation = implementation_;

        // Delegate _becomeImplementation
        delegateToImplementation(abi.encodeWithSignature("_becomeImplementation(bytes)", becomeImplementationData));

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
     * @notice Internal method to delegate execution to another contract
     * @dev It returns to the external caller whatever the implementation returns or forwards reverts
     * @param callee The contract to delegatecall
     * @param data The raw data to delegatecall
     * @return The returned bytes from the delegatecall
     */
    function delegateTo(address callee, bytes memory data) internal returns (bytes memory) {
        (bool success, bytes memory returnData) = callee.delegatecall(data);
        assembly {
            if eq(success, 0) {
                revert(add(returnData, 0x20), returndatasize)
            }
        }
        return returnData;
    }

    /**
     * @notice Delegates execution to the implementation contract
     * @dev It returns to the external caller whatever the implementation returns or forwards reverts
     * @param data The raw data to delegatecall
     * @return The returned bytes from the delegatecall
     */
    function delegateToImplementation(bytes memory data) internal returns (bytes memory) {
        return delegateTo(implementation, data);
    }

    /**
     * @notice Returns a boolean indicating if the implementation is to be auto-upgraded
     * Returns false instead of reverting if the Unitroller does not have this 
     */
    function autoImplementation() public view returns (bool) {
        (bool success, bytes memory returnData) = address(this).staticcall(abi.encodeWithSignature("_comptroller()"));
        require(success);
        address ct = abi.decode(returnData, (address));
        return ComptrollerV3Storage(ct).autoImplementation();
    }

    /**
     * @notice Returns the current per-block supply interest rate for this cToken
     * @return The supply interest rate per block, scaled by 1e18
     */
    function _comptroller() external returns (address) {
        return abi.decode(delegateToImplementation(abi.encodeWithSignature("comptroller()")), (address));
    }

    /**
     * @notice Delegates execution to an implementation contract
     * @dev It returns to the external caller whatever the implementation returns or forwards reverts
     */
    function () external payable {
        // Check for automatic implementation
        if (autoImplementation()) {
            (address latestCEtherDelegate, bool allowResign, bytes memory becomeImplementationData) = fuseAdmin.latestCEtherDelegate(implementation);
            if (implementation != latestCEtherDelegate) __setImplementation(latestCEtherDelegate, allowResign, becomeImplementationData);
        }

        // delegate all other functions to current implementation
        (bool success, ) = implementation.delegatecall(msg.data);

        assembly {
            let free_mem_ptr := mload(0x40)
            returndatacopy(free_mem_ptr, 0, returndatasize)

            switch success
            case 0 { revert(free_mem_ptr, returndatasize) }
            default { return(free_mem_ptr, returndatasize) }
        }
    }
}
