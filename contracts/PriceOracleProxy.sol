pragma solidity ^0.5.8;

import "./CErc20.sol";
import "./CToken.sol";
import "./PriceOracle.sol";
import "./Comptroller.sol";

interface V1PriceOracleInterface {
    function assetPrices(address asset) external view returns (uint);
}

contract PriceOracleProxy is PriceOracle {
    /**
     * @notice The v1 price oracle, which will continue to serve prices
     * prices for v1 assets
     */
    V1PriceOracleInterface public v1PriceOracle;

    /**
     * @notice The active comptroller, which will be checked for listing status
     * to short circuit and return 0 for unlisted assets.
     *
     * @dev Listed markets are not part of the comptroller interface used by
     * cTokens, so we assumena an instance of v1 comptroller.sol instead
     */
    Comptroller public comptroller;

    /**
     * @notice address of the cEther contract, which has a constant price
     */
    address public cEtherAddress;

    /**
     * @notice Indicator that this is a PriceOracle contract (for inspection)
     */
    bool public constant isPriceOracle = true;

    /**
     * @param comptroller_ The address of the active comptroller, which will
     * be consulted for market listing status.
     * @param v1PriceOracle_ The address of the v1 price oracle, which will
     * continue to operate and hold prices for collateral assets.
     * @param cEtherAddress_ The address of the cEther contract, which will
     * return a constant 1e18, since all prices relative to ether
     */
    constructor(address comptroller_, address v1PriceOracle_, address cEtherAddress_) public {
        comptroller = Comptroller(comptroller_);
        v1PriceOracle = V1PriceOracleInterface(v1PriceOracle_);
        cEtherAddress = cEtherAddress_;
    }

    /**
     * @notice Get the underlying price of a listed cToken asset
     * @param cToken The cToken to get the underlying price of
     * @return The underlying asset price mantissa (scaled by 1e18).
     *  Zero means the price is unavailable.
     */
    function getUnderlyingPrice(CToken cToken) public view returns (uint) {
        address cTokenAddress = address(cToken);
        (bool isListed, ) = comptroller.markets(cTokenAddress);

        if (!isListed) {
            // not listed, worthless
            return 0;
        } else if (cTokenAddress == cEtherAddress) {
            // ether always worth 1
            return 1e18;
        } else {
            // read from v1 oracle
            address underlying = CErc20(cTokenAddress).underlying();
            return v1PriceOracle.assetPrices(underlying);
        }
    }
}
