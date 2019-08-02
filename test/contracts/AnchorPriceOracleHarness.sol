pragma solidity ^0.5.8;

import "../AnchorPriceOracle.sol";

contract AnchorPriceOracleHarness is AnchorPriceOracle {
    mapping (address => uint256) updateCount;

    constructor(address poster) public AnchorPriceOracle(poster) {}

    function numSetPriceCalls(address asset) public view returns (uint256) {
        return updateCount[asset];
    }

    function harnessClearStoredPrice(address asset) public {
        _assetPrices[asset] = Exp({mantissa: 0});
    }

    function setPriceStorageInternal(address asset, uint priceMantissa) internal {
        _assetPrices[asset] = Exp({mantissa: priceMantissa});
        updateCount[asset] += 1;
    }

    function harnessCapToMax(uint anchorPriceMantissa, uint priceMantissa) view public returns (uint, bool, uint) {
        (MathError err, bool wasCapped, Exp memory newPrice) = capToMax(Exp({mantissa: anchorPriceMantissa}), Exp({mantissa: priceMantissa}));
        return (uint(err), wasCapped, newPrice.mantissa);
    }

    function harnessCalculateSwing(uint anchorPriceMantissa, uint priceMantissa) pure public returns (uint, uint) {
        (MathError err, Exp memory swing) = calculateSwing(Exp({mantissa: anchorPriceMantissa}), Exp({mantissa: priceMantissa}));
        return (uint(err), swing.mantissa);
    }

    function harnessSetMaxSwing(uint newMaxSwingMantissa) public {
        maxSwing = Exp({mantissa: newMaxSwingMantissa});
    }

    function harnessSetAnchor(address asset, uint anchorPriceMantissa, uint anchorPeriod) public {
        anchors[asset] = Anchor({period: anchorPeriod, priceMantissa: anchorPriceMantissa});
    }
}