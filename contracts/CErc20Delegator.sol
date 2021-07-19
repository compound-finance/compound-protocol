pragma solidity ^0.5.16;

import "./CTokenInterfaces.sol";
import "./Unitroller.sol";

/**
 * @title Compound's CErc20Delegator Contract
 * @notice CTokens which wrap an EIP-20 underlying and delegate to an implementation
 * @author Compound
 */
contract CErc20Delegator is CDelegatorInterface, CTokenAdminStorage {
    /**
     * @notice Construct a new money market
     * @param underlying_ The address of the underlying asset
     * @param comptroller_ The address of the Comptroller
     * @param interestRateModel_ The address of the interest rate model
     * @param initialExchangeRateMantissa_ The initial exchange rate, scaled by 1e18
     * @param name_ ERC-20 name of this token
     * @param symbol_ ERC-20 symbol of this token
     * @param decimals_ ERC-20 decimal precision of this token
     * @param implementation_ The address of the implementation the contract delegates to
     * @param becomeImplementationData The encoded args for becomeImplementation
     */
    constructor(address underlying_,
                ComptrollerInterface comptroller_,
                InterestRateModel interestRateModel_,
                uint initialExchangeRateMantissa_,
                string memory name_,
                string memory symbol_,
                uint8 decimals_,
                address implementation_,
                bytes memory becomeImplementationData,
                uint256 reserveFactorMantissa_,
                uint256 adminFeeMantissa_) public {
        // First delegate gets to initialize the delegator (i.e. storage contract)
        delegateTo(implementation_, abi.encodeWithSignature("initialize(address,address,address,uint256,string,string,uint8,uint256,uint256)",
                                                            underlying_,
                                                            comptroller_,
                                                            interestRateModel_,
                                                            initialExchangeRateMantissa_,
                                                            name_,
                                                            symbol_,
                                                            decimals_,
                                                            reserveFactorMantissa_,
                                                            adminFeeMantissa_));

        // New implementations always get set via the settor (post-initialize)
        _setImplementation(implementation_, false, becomeImplementationData);
    }

    /**
     * @notice Called by the admin to update the implementation of the delegator
     * @param implementation_ The address of the new implementation for delegation
     * @param allowResign Flag to indicate whether to call _resignImplementation on the old implementation
     * @param becomeImplementationData The encoded bytes data to be passed to _becomeImplementation
     */
    function _setImplementation(address implementation_, bool allowResign, bytes memory becomeImplementationData) public {
        require(hasAdminRights(), "CErc20Delegator::_setImplementation: Caller must be admin");
        require(fuseAdmin.cErc20DelegateWhitelist(implementation_, allowResign), "New implementation contract address not whitelisted or allowResign must be inverted.");

        if (allowResign) {
            delegateToImplementation(abi.encodeWithSignature("_resignImplementation()"));
        }

        address oldImplementation = implementation;
        implementation = implementation_;

        delegateToImplementation(abi.encodeWithSignature("_becomeImplementation(bytes)", becomeImplementationData));

        emit NewImplementation(oldImplementation, implementation);
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
    function delegateToImplementation(bytes memory data) public returns (bytes memory) {
        return delegateTo(implementation, data);
    }

    /**
     * @notice Returns a boolean indicating if the implementation is to be auto-upgraded
     * Returns false instead of reverting if the Unitroller does not have this 
     */
    function autoImplementation() internal view returns (bool) {
        address ct;
        assembly {
            ct := sload(8)
        }
        (bool success, bytes memory returndata) = ct.staticcall(abi.encodePacked(bytes4(keccak256("autoImplementation()"))));
        if (!success) return false;
        (success) = abi.decode(returndata, (bool));
        return success;
    }

    /**
     * @notice Delegates execution to an implementation contract
     * @dev It returns to the external caller whatever the implementation returns or forwards reverts
     */
    function () external payable {
        require(msg.value == 0,"CErc20Delegator:fallback: cannot send value to fallback");

        // Check for automatic implementation
        if (autoImplementation()) {
            (address latestCErc20Delegate, bool allowResign, bytes memory becomeImplementationData) = fuseAdmin.latestCEtherDelegate();

            if (implementation != latestCErc20Delegate) {
                if (allowResign) delegateToImplementation(abi.encodeWithSignature("_resignImplementation()"));
                address oldImplementation = implementation;
                implementation = latestCErc20Delegate;
                delegateToImplementation(abi.encodeWithSignature("_becomeImplementation(bytes)", becomeImplementationData));
                emit NewImplementation(oldImplementation, implementation);
            }
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
