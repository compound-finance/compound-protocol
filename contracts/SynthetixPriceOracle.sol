pragma solidity ^0.5.16;

import "./PriceOracle.sol";
import "./ChainlinkPriceOracle.sol";
import "./CErc20.sol";

interface ExchangeRates {
    function effectiveValue(
        bytes32 sourceCurrencyKey,
        uint sourceAmount,
        bytes32 destinationCurrencyKey
    ) external view returns (uint value);
}

interface AddressResolver {
    function requireAndGetAddress(bytes32 name, string calldata reason) external view returns (address);
}

contract MixinResolver {
    AddressResolver public resolver;
}

interface ISynth {
    function currencyKey() external view returns (bytes32);
}

/**
 * @title SynthetixPriceOracle
 * @notice Returns prices for Synths from Synthetix's official `ExchangeRates` contract.
 * @dev Implements `PriceOracle`.
 * @author David Lucid <david@rari.capital>
 */
contract SynthetixPriceOracle is PriceOracle {
    /**
     * @dev Synthetix's official `ExchangeRates` contract.
     */
    ExchangeRates public rootOracle = ExchangeRates(0xd69b189020EF614796578AfE4d10378c5e7e1138);

    /**
     * @dev Returns the price in ETH of the token underlying `cToken` (implements `PriceOracle`).
     */
    function getUnderlyingPrice(CToken cToken) public view returns (uint) {
        address underlying = CErc20(address(cToken)).underlying();
        uint256 baseUnit = 10 ** uint(EIP20Interface(underlying).decimals());
        ExchangeRates exchangeRates = ExchangeRates(MixinResolver(underlying).resolver().requireAndGetAddress("ExchangeRates", "Failed to get Synthetix's ExchangeRates contract address."));
        return mul(exchangeRates.effectiveValue(ISynth(underlying).currencyKey(), baseUnit, "ETH"), 1e36) / baseUnit;
    }

    /// @dev Overflow proof multiplication
    function mul(uint a, uint b) internal pure returns (uint) {
        if (a == 0) return 0;
        uint c = a * b;
        require(c / a == b, "multiplication overflow");
        return c;
    }
}
