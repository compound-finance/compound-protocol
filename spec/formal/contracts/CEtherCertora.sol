pragma solidity ^0.5.8;

import "../../../contracts/CEther.sol";

contract CEtherCertora is CEther {
    constructor(ComptrollerInterface comptroller_,
                InterestRateModel interestRateModel_,
                uint initialExchangeRateMantissa_,
                string memory name_,
                string memory symbol_,
                uint decimals_) public CEther(comptroller_, interestRateModel_, initialExchangeRateMantissa_, name_, symbol_, decimals_) {
    }
}
