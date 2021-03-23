pragma solidity ^0.5.16;

import "../../../contracts/VEther.sol";

contract VEtherCertora is VEther {
    constructor(ControllerInterface controller_,
                InterestRateModel interestRateModel_,
                uint initialExchangeRateMantissa_,
                string memory name_,
                string memory symbol_,
                uint8 decimals_,
                address payable admin_) public VEther(controller_, interestRateModel_, initialExchangeRateMantissa_, name_, symbol_, decimals_, admin_) {
    }
}
