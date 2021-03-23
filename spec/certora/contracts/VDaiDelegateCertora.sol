pragma solidity ^0.5.16;

import "../../../contracts/VDaiDelegate.sol";

contract VDaiDelegateCertora is VDaiDelegate {
    function getCashOf(address account) public view returns (uint) {
        return EIP20Interface(underlying).balanceOf(account);
    }
}
