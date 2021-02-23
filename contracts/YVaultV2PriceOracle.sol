pragma solidity ^0.5.16;

import "./PriceOracle.sol";
import "./BasePriceOracle.sol";
import "./CErc20.sol";
import "./EIP20Interface.sol";

contract IVaultV2 is EIP20Interface {
    function pricePerShare() external view returns (uint);
    function token() external view returns (address);
}

/**
 * @title YVaultV2PriceOracle
 * @notice Returns prices for yVaults using the sender as a root oracle.
 * @dev Implements `PriceOracle`.
 * @author David Lucid <david@rari.capital>
 */
contract YVaultV2PriceOracle is PriceOracle {
    /**
     * @dev Returns the price in ETH of the token underlying `cToken` (implements `PriceOracle`).
     */
    function getUnderlyingPrice(CToken cToken) public view returns (uint) {
        // Get price of token underlying yVault
        IVaultV2 yVault = IVaultV2(CErc20(address(cToken)).underlying());
        address underlyingToken = yVault.token();
        uint underlyingPrice = underlyingToken == 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 ? 1e18 : BasePriceOracle(msg.sender).price(underlyingToken);

        // yVault/ETH = yVault/token * token/ETH
        return mul(yVault.pricePerShare(), underlyingPrice) / (10 ** uint256(yVault.decimals()));
    }

    /// @dev Overflow proof multiplication
    function mul(uint a, uint b) internal pure returns (uint) {
        if (a == 0) return 0;
        uint c = a * b;
        require(c / a == b, "multiplication overflow");
        return c;
    }
}
