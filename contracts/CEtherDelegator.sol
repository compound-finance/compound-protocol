pragma solidity ^0.5.16;

import "./CTokenInterfaces.sol";
import "./ComptrollerStorage.sol";

/**
 * @title Compound's CEtherDelegator Contract
 * @notice CTokens which wrap Ether and delegate to an implementation
 * @author Compound
 */
contract CEtherDelegator is CDelegationStorage {
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
        delegateTo(implementation_, abi.encodeWithSignature("_setImplementationSafe(address,bool,bytes)", implementation_, false, becomeImplementationData));
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
     * @notice Delegates execution to an implementation contract
     * @dev It returns to the external caller whatever the implementation returns or forwards reverts
     */
    function () external payable {
        // Check for automatic implementation
        delegateTo(implementation, abi.encodeWithSignature("_prepare()"));

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
