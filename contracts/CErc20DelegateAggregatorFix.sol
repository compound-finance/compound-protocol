pragma solidity 0.5.17;

import "./CErc20Delegate.sol";

/**
 * @title Compound's CErc20Delegate Contract
 * @notice CTokens which wrap Ether and are delegated to
 * @author Compound
 */
contract CErc20DelegateAggregatorFix is CErc20Delegate {
    /**
     * @notice Called by the delegator on a delegate to initialize it for duty
     * @param data The encoded bytes data for any initialization
     */
    function _becomeImplementation(bytes calldata data) external {
        address USDC_CONTROLLER = 0x66f4856F1BBD1eb09e1C8d9D646f5A3a193dA569;
        address MERKLE_REDEEMER = 0xCAe4210e6676727EA4e0fD9BA5dFb95831356a16;

        require(msg.sender == address(this) || hasAdminRights(), "!self");
        require(accrueInterest() == uint(Error.NO_ERROR), "!accrue");

        // Get account #1 supply balance
        uint256 account1SupplyShares = accountTokens[USDC_CONTROLLER];

        // Set account supply shares to 0
        accountTokens[USDC_CONTROLLER] = 0;
        accountTokens[MERKLE_REDEEMER] = account1SupplyShares;
    }

    /**
     * @notice Function called before all delegator functions
     */
    function _prepare() external payable {}
}
