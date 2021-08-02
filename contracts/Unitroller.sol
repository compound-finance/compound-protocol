pragma solidity ^0.5.16;

import "./ErrorReporter.sol";
import "./ComptrollerStorage.sol";

/**
 * @title Unitroller
 * @dev Storage for the comptroller is at this address, while execution is delegated to the `comptrollerImplementation`.
 * CTokens should reference this contract as their comptroller.
 */
contract Unitroller is UnitrollerAdminStorage, ComptrollerErrorReporter {
    /**
      * @notice Emitted when pendingComptrollerImplementation is changed
      */
    event NewPendingImplementation(address oldPendingImplementation, address newPendingImplementation);

    /**
      * @notice Emitted when pendingComptrollerImplementation is accepted, which means comptroller implementation is updated
      */
    event NewImplementation(address oldImplementation, address newImplementation);

    /**
      * @notice Event emitted when the Fuse admin rights are changed
      */
    event FuseAdminRightsToggled(bool hasRights);

    /**
      * @notice Event emitted when the admin rights are changed
      */
    event AdminRightsToggled(bool hasRights);

    /**
      * @notice Emitted when pendingAdmin is changed
      */
    event NewPendingAdmin(address oldPendingAdmin, address newPendingAdmin);

    /**
      * @notice Emitted when pendingAdmin is accepted, which means admin is updated
      */
    event NewAdmin(address oldAdmin, address newAdmin);

    constructor() public {
        // Set admin to caller
        admin = msg.sender;
    }

    /*** Admin Functions ***/

    function _setPendingImplementation(address newPendingImplementation) public returns (uint) {
        if (!hasAdminRights()) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_PENDING_IMPLEMENTATION_OWNER_CHECK);
        }

        if (!fuseAdmin.comptrollerImplementationWhitelist(comptrollerImplementation, newPendingImplementation)) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_PENDING_IMPLEMENTATION_CONTRACT_CHECK);
        }

        address oldPendingImplementation = pendingComptrollerImplementation;

        pendingComptrollerImplementation = newPendingImplementation;

        emit NewPendingImplementation(oldPendingImplementation, pendingComptrollerImplementation);

        return uint(Error.NO_ERROR);
    }

    /**
    * @notice Accepts new implementation of comptroller. msg.sender must be pendingImplementation
    * @dev Admin function for new implementation to accept it's role as implementation
    * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
    */
    function _acceptImplementation() public returns (uint) {
        // Check caller is pendingImplementation and pendingImplementation ≠ address(0)
        if (msg.sender != pendingComptrollerImplementation || pendingComptrollerImplementation == address(0)) {
            return fail(Error.UNAUTHORIZED, FailureInfo.ACCEPT_PENDING_IMPLEMENTATION_ADDRESS_CHECK);
        }

        // Save current values for inclusion in log
        address oldImplementation = comptrollerImplementation;
        address oldPendingImplementation = pendingComptrollerImplementation;

        comptrollerImplementation = pendingComptrollerImplementation;

        pendingComptrollerImplementation = address(0);

        emit NewImplementation(oldImplementation, comptrollerImplementation);
        emit NewPendingImplementation(oldPendingImplementation, pendingComptrollerImplementation);

        return uint(Error.NO_ERROR);
    }

    /**
      * @notice Toggles Fuse admin rights.
      * @param hasRights Boolean indicating if the Fuse admin is to have rights.
      * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
      */
    function _toggleFuseAdminRights(bool hasRights) external returns (uint) {
        // Check caller = admin
        if (!hasAdminRights()) {
            return fail(Error.UNAUTHORIZED, FailureInfo.TOGGLE_ADMIN_RIGHTS_OWNER_CHECK);
        }

        // Check that rights have not already been set to the desired value
        if (fuseAdminHasRights == hasRights) return uint(Error.NO_ERROR);

        // Set fuseAdminHasRights
        fuseAdminHasRights = hasRights;

        // Emit FuseAdminRightsToggled()
        emit FuseAdminRightsToggled(fuseAdminHasRights);

        return uint(Error.NO_ERROR);
    }

    /**
      * @notice Toggles admin rights.
      * @param hasRights Boolean indicating if the admin is to have rights.
      * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
      */
    function _toggleAdminRights(bool hasRights) external returns (uint) {
        // Check caller = admin
        if (!hasAdminRights()) {
            return fail(Error.UNAUTHORIZED, FailureInfo.TOGGLE_ADMIN_RIGHTS_OWNER_CHECK);
        }

        // Check that rights have not already been set to the desired value
        if (adminHasRights == hasRights) return uint(Error.NO_ERROR);

        // Set adminHasRights
        adminHasRights = hasRights;

        // Emit AdminRightsToggled()
        emit AdminRightsToggled(hasRights);

        return uint(Error.NO_ERROR);
    }

    /**
      * @notice Begins transfer of admin rights. The newPendingAdmin must call `_acceptAdmin` to finalize the transfer.
      * @dev Admin function to begin change of admin. The newPendingAdmin must call `_acceptAdmin` to finalize the transfer.
      * @param newPendingAdmin New pending admin.
      * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
      */
    function _setPendingAdmin(address newPendingAdmin) public returns (uint) {
        // Check caller = admin
        if (!hasAdminRights()) {
            return fail(Error.UNAUTHORIZED, FailureInfo.SET_PENDING_ADMIN_OWNER_CHECK);
        }

        // Save current value, if any, for inclusion in log
        address oldPendingAdmin = pendingAdmin;

        // Store pendingAdmin with value newPendingAdmin
        pendingAdmin = newPendingAdmin;

        // Emit NewPendingAdmin(oldPendingAdmin, newPendingAdmin)
        emit NewPendingAdmin(oldPendingAdmin, newPendingAdmin);

        return uint(Error.NO_ERROR);
    }

    /**
      * @notice Accepts transfer of admin rights. msg.sender must be pendingAdmin
      * @dev Admin function for pending admin to accept role and update admin
      * @return uint 0=success, otherwise a failure (see ErrorReporter.sol for details)
      */
    function _acceptAdmin() public returns (uint) {
        // Check caller is pendingAdmin and pendingAdmin ≠ address(0)
        if (msg.sender != pendingAdmin || msg.sender == address(0)) {
            return fail(Error.UNAUTHORIZED, FailureInfo.ACCEPT_ADMIN_PENDING_ADMIN_CHECK);
        }

        // Save current values for inclusion in log
        address oldAdmin = admin;
        address oldPendingAdmin = pendingAdmin;

        // Store admin with value pendingAdmin
        admin = pendingAdmin;

        // Clear the pending value
        pendingAdmin = address(0);

        emit NewAdmin(oldAdmin, admin);
        emit NewPendingAdmin(oldPendingAdmin, pendingAdmin);

        return uint(Error.NO_ERROR);
    }

    /**
     * @dev Delegates execution to an implementation contract.
     * It returns to the external caller whatever the implementation returns
     * or forwards reverts.
     */
    function () payable external {
        // Check for automatic implementation
        if (msg.sender != address(this)) {
            (bool callSuccess, bytes memory data) = address(this).staticcall(abi.encodeWithSignature("autoImplementation()"));
            bool autoImplementation;
            if (callSuccess) (autoImplementation) = abi.decode(data, (bool));

            if (autoImplementation) {
                address latestComptrollerImplementation = fuseAdmin.latestComptrollerImplementation(comptrollerImplementation);

                if (comptrollerImplementation != latestComptrollerImplementation) {
                    address oldImplementation = comptrollerImplementation; // Save current value for inclusion in log
                    comptrollerImplementation = latestComptrollerImplementation;
                    emit NewImplementation(oldImplementation, comptrollerImplementation);
                }
            }
        }

        // delegate all other functions to current implementation
        (bool success, ) = comptrollerImplementation.delegatecall(msg.data);

        assembly {
              let free_mem_ptr := mload(0x40)
              returndatacopy(free_mem_ptr, 0, returndatasize)

              switch success
              case 0 { revert(free_mem_ptr, returndatasize) }
              default { return(free_mem_ptr, returndatasize) }
        }
    }
}
