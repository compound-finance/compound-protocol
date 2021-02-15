pragma solidity ^0.5.16;

import "./CEther.sol";

/**
 * @title Compound's CEtherImmutable Contract
 * @notice CTokens which wrap Ether and are immutable
 * @author Compound
 */
contract CEtherImmutable is CEther {
    /**
     * @notice Construct a new money market
     * @param comptroller_ The address of the Comptroller
     * @param interestRateModel_ The address of the interest rate model
     * @param initialExchangeRateMantissa_ The initial exchange rate, scaled by 1e18
     * @param name_ ERC-20 name of this token
     * @param symbol_ ERC-20 symbol of this token
     * @param decimals_ ERC-20 decimal precision of this token
     * @param admin_ Address of the administrator of this token
     */
    constructor(ComptrollerInterface comptroller_,
                InterestRateModel interestRateModel_,
                uint initialExchangeRateMantissa_,
                string memory name_,
                string memory symbol_,
                uint8 decimals_,
                address payable admin_) public {
        // Creator of the contract is admin during initialization
        admin = msg.sender;

        // Initialize the market
        initialize(comptroller_, interestRateModel_, initialExchangeRateMantissa_, name_, symbol_, decimals_, 0, 0);

        // Set the proper admin now that initialization is done
        admin = admin_;
    }
}
