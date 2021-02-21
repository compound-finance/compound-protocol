pragma solidity ^0.5.16;

import "./PriceOracle.sol";
import "./EIP20Interface.sol";
import "./CErc20.sol";

interface Keep3rV1Oracle {
    function current(address tokenIn, uint amountIn, address tokenOut) external view returns (uint amountOut);
    function update(address tokenA, address tokenB) external keeper returns (bool);
}

/**
 * @title Keep3rPriceOracle
 * @notice Returns prices from `Keep3rV1Oracle` or `SushiswapV1Oracle`.
 * @dev Implements `PriceOracle`.
 * @author David Lucid <david@rari.capital>
 */
contract Keep3rPriceOracle is PriceOracle {
    /**
     * @dev Constructor that sets the Keep3rV1Oracle or SushiswapV1Oracle.
     */
    constructor (bool sushiswap) public {
        oracle = Keep3rV1Oracle(sushiswap ? 0xf67Ab1c914deE06Ba0F264031885Ea7B276a7cDa : 0x73353801921417f465377c8d898c6f4c0270282c);
    }

    /**
     * @dev mStable imUSD ERC20 token contract object.
     */
    Keep3rV1Oracle public oracle = Keep3rV1Oracle(0x73353801921417f465377c8d898c6f4c0270282c);

    /**
     * @dev WETH token contract address.
     */
    address constant public WETH_ADDRESS = Keep3rV1Oracle(0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2);
    
    /**
     * @dev Returns the price in ETH of the token underlying `cToken` (implements `PriceOracle`).
     */
    function getUnderlyingPrice(CToken cToken) public view returns (uint) {
        // Return 1e18 for ETH
        if (cToken.isCEther()) return 1e18;

        // Get underlying ERC20 token address
        address underlying = address(CErc20(address(cToken)).underlying());

        // Return 1e18 for WETH
        if (underlying == 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2) return 1e18;

        // Call Keep3r for ERC20 price, format, and return
        address underlying = CErc20(address(cToken)).underlying();
        uint256 baseUnit = (10 ** EIP20Interface(underlying).decimals());
        return mul(oracle.current(underlying, baseUnit, WETH_ADDRESS), 1e18) / baseUnit;
    }
    
    /**
     * @dev Updates prices for each of `underlyings` via the `Keep3rV1Oracle`.
     */
    function postPrices(address[] memory underlyings) external view returns (uint) {
        for (uint256 i = 0; i < underlyings.length; i++) return oracle.update(underlyings[i], WETH_ADDRESS);
    }

    /// @dev Overflow proof multiplication
    function mul(uint a, uint b) internal pure returns (uint) {
        if (a == 0) return 0;
        uint c = a * b;
        require(c / a == b, "multiplication overflow");
        return c;
    }
}
