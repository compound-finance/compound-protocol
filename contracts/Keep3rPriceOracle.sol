pragma solidity ^0.5.16;

import "./PriceOracle.sol";
import "./EIP20Interface.sol";
import "./CErc20.sol";

interface Keep3rV1Oracle {
    function current(address tokenIn, uint amountIn, address tokenOut) external view returns (uint amountOut);
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
        oracle = Keep3rV1Oracle(sushiswap ? 0xf67Ab1c914deE06Ba0F264031885Ea7B276a7cDa : 0x73353801921417F465377c8d898c6f4C0270282C);
    }

    /**
     * @dev mStable imUSD ERC20 token contract object.
     */
    Keep3rV1Oracle public oracle = Keep3rV1Oracle(0x73353801921417F465377c8d898c6f4C0270282C);

    /**
     * @dev WETH token contract address.
     */
    address constant public WETH_ADDRESS = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    
    /**
     * @dev Returns the price in ETH of the token underlying `cToken` (implements `PriceOracle`).
     */
    function getUnderlyingPrice(CToken cToken) public view returns (uint) {
        // Return 1e18 for ETH
        if (cToken.isCEther()) return 1e18;

        // Get underlying ERC20 token address
        address underlying = CErc20(address(cToken)).underlying();

        // Return 1e18 for WETH
        if (underlying == WETH_ADDRESS) return 1e18;

        // Call Keep3r for ERC20 price, format, and return
        uint256 baseUnit = (10 ** uint256(EIP20Interface(underlying).decimals()));
        return mul(oracle.current(underlying, baseUnit, WETH_ADDRESS), 1e18) / baseUnit;
    }

    /// @dev Overflow proof multiplication
    function mul(uint a, uint b) internal pure returns (uint) {
        if (a == 0) return 0;
        uint c = a * b;
        require(c / a == b, "multiplication overflow");
        return c;
    }
}
