pragma solidity ^0.5.12;

import "../../../contracts/CDaiDelegate.sol";

contract CDaiDelegateCertora is CDaiDelegate {
    function getCashOf(address account) public view returns (uint) {
        return EIP20Interface(underlying).balanceOf(account);
    }
}
