// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;
import "../PriceOracle.sol";
import "./IBandAggregator.sol";

error NotAnAdmin();
error BadAssetSymbol();
error BadPriceAggregator();

contract BandPriceOracle is PriceOracle {
    /**
    * @dev An admin who can set the oracle price aggregator address
    *      Set in the constructor
    */
    address public oracleAdmin;

    /**
    * @dev A price aggregator that fetches asset prices
    *      Set by calling the setPriceAggregator() function
    */
    IBandAggregator public priceAggregator;

    /**
    * @dev A mapping of asset address to its symbol to fetch price
    *      Set by calling the setAssetSymbol() function
    */
    mapping(address => string) public assetSymbols;

    /**
     * @dev Emitted for aggregator changes.
     */
    event SetPriceAggregator(IBandAggregator oldPriceAggregator, IBandAggregator newPriceAggregator);

    constructor(){
        oracleAdmin = msg.sender;
    }

    /**
     * @dev Set the price aggregator address
     *      Can only be called by the oracle admin
     * @param newPriceAggregator New price aggregator
     */
    function setPriceAggregator(IBandAggregator newPriceAggregator) external {
        if(msg.sender != oracleAdmin){
            revert NotAnAdmin();
        }

        if(newPriceAggregator.ref() == address(0)){
            revert BadPriceAggregator();
        }

        IBandAggregator oldPriceAggregator = priceAggregator;
        if(newPriceAggregator == oldPriceAggregator){
            revert BadPriceAggregator();
        }

        priceAggregator = newPriceAggregator;
        emit SetPriceAggregator(oldPriceAggregator, newPriceAggregator);
    }

    /**
     * @dev Set the asset symbol
     *      Can only be called by the oracle admin
     * @param asset Asset address
     * @param newSymbol Symbol of the asset
     */
    function setAssetSymbol(address asset, string memory newSymbol) external {
        if(msg.sender != oracleAdmin){
            revert NotAnAdmin();
        }

        if(bytes(newSymbol).length == 0){
            revert BadAssetSymbol();
        }

        string memory oldSymbol = assetSymbols[asset];
        if(keccak256(abi.encodePacked(oldSymbol)) == keccak256(abi.encodePacked(newSymbol))){
            revert BadAssetSymbol();
        }

        assetSymbols[asset] = newSymbol;
    }

    /**
     * @dev Get the underlying price of a CToken asset
     * @param cToken The asset to fetch underlying price for
     */
    function getUnderlyingPrice(CToken cToken) external view returns (uint) {
        if (priceAggregator == IBandAggregator(address(0))) {
            return 0;
        }

        string memory assetSymbol = assetSymbols[address (cToken)];
        if (bytes(assetSymbol).length == 0){
            return 0;
        }

        (uint256 _aggregatorPrice, ,) = priceAggregator.getReferenceData(assetSymbol, "USD");
        return _aggregatorPrice;
    }
}
