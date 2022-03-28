pragma solidity ^0.5.16;

import "./ErrorReporter.sol";
import "./ComptrollerInterface.sol";
import "./ComptrollerStorage.sol";
import "./Unitroller.sol";
import "./EIP20NonStandardInterface.sol";

/**
 * @title Compound's Comptroller Contract
 * @author Compound
 */
contract ComptrollerSweeper is ComptrollerV7Storage {
    function _become(Unitroller unitroller) public {
        require(msg.sender == unitroller.admin(), "only unitroller admin can change brains");
        require(unitroller._acceptImplementation() == 0, "change not authorized");
    }

    function sweep(EIP20NonStandardInterface token) public {
        require(msg.sender == admin);
        token.transfer(admin, token.balanceOf(address(this)));
    }
}
