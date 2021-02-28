pragma solidity ^0.5.16;

import "./PriceOracle.sol";
import "./EIP20Interface.sol";
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

contract Proxy {
    address public target;
}

/**
 * @title SynthetixPriceOracle
 * @notice Returns prices for Synths from Synthetix's official `ExchangeRates` contract.
 * @dev Implements `PriceOracle`.
 * @author David Lucid <david@rari.capital>
 */
contract SynthetixPriceOracle is PriceOracle {
    /**
     * @dev Returns the price in ETH of the token underlying `cToken` (implements `PriceOracle`).
     */
    function getUnderlyingPrice(CToken cToken) public view returns (uint) {
        address underlying = CErc20(address(cToken)).underlying();
        uint256 baseUnit = 10 ** uint(EIP20Interface(underlying).decimals());
        underlying = Proxy(underlying).target(); // For some reason we have to use the logic contract instead of the proxy contract to get `resolver` and `currencyKey`
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
