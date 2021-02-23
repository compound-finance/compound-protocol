pragma solidity ^0.5.16;

import "./PriceOracle.sol";
import "./EIP20Interface.sol";
import "./CErc20.sol";

contract Bank is EIP20Interface {
    /// @dev Return the total ETH entitled to the token holders. Be careful of unaccrued interests.
    function totalETH() public view returns (uint256);
}

/**
 * @title AlphaHomoraV1PriceOracle
 * @notice Returns prices the Alpha Homora V1 ibETH ERC20 token.
 * @dev Implements `PriceOracle`.
 * @author David Lucid <david@rari.capital>
 */
contract AlphaHomoraV1PriceOracle is PriceOracle {
    /**
     * @dev Alpha Homora ibETH token contract object.
     */
    Bank constant public IBETH = Bank(0x67B66C99D3Eb37Fa76Aa3Ed1ff33E8e39F0b9c7A);

    /**
     * @dev Returns the price in ETH of the token underlying `cToken` (implements `PriceOracle`).
     */
    function getUnderlyingPrice(CToken cToken) public view returns (uint) {
        require(CErc20(address(cToken)).underlying() == address(IBETH));
        return mul(IBETH.totalETH(), 1e18) / IBETH.totalSupply();
    }

    /// @dev Overflow proof multiplication
    function mul(uint a, uint b) internal pure returns (uint) {
        if (a == 0) return 0;
        uint c = a * b;
        require(c / a == b, "multiplication overflow");
        return c;
    }
}
