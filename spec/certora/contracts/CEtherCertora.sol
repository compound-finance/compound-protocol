pragma solidity ^0.8.10;

import "../../../contracts/XEther.sol";

contract XEtherCertora is XEther {
    constructor(ComptrollerInterface comptroller_,
                InterestRateModel interestRateModel_,
                uint initialExchangeRateMantissa_,
                string memory name_,
                string memory symbol_,
                uint8 decimals_,
                address payable admin_) public XEther(comptroller_, interestRateModel_, initialExchangeRateMantissa_, name_, symbol_, decimals_, admin_) {
    }
}
