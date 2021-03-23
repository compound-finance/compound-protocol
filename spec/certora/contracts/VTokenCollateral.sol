pragma solidity ^0.5.16;

import "../../../contracts/VErc20Immutable.sol";
import "../../../contracts/EIP20Interface.sol";

contract VTokenCollateral is VErc20Immutable {
    constructor(address underlying_,
                ControllerInterface controller_,
                InterestRateModel interestRateModel_,
                uint initialExchangeRateMantissa_,
                string memory name_,
                string memory symbol_,
                uint8 decimals_,
                address payable admin_) public VErc20Immutable(underlying_, controller_, interestRateModel_, initialExchangeRateMantissa_, name_, symbol_, decimals_, admin_) {
    }

    function getCashOf(address account) public view returns (uint) {
        return EIP20Interface(underlying).balanceOf(account);
    }
}
