pragma solidity ^0.5.16;

import "./PriceOracle.sol";
import "./CErc20.sol";

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function version() external view returns (uint256);

    // getRoundData and latestRoundData should both raise "No data present"
    // if they do not have data to report, instead of returning unset values
    // which could be misinterpreted as actual reported values.
    function getRoundData(uint80 _roundId)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

contract ChainlinkPriceOracle is PriceOracle {
    mapping(address => AggregatorV3Interface) public priceFeeds;
    
    constructor() public {
        priceFeeds[0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9] = AggregatorV3Interface(0x6Df09E975c830ECae5bd4eD9d90f3A95a4f88012); // AAVE
        priceFeeds[0xa117000000f279D81A1D3cc75430fAA017FA5A2e] = AggregatorV3Interface(0x8f83670260F8f7708143b836a2a6F11eF0aBac01); // ANT
        priceFeeds[0xba100000625a3754423978a60c9317c58a424e3D] = AggregatorV3Interface(0xC1438AA3823A6Ba0C159CfA8D98dF5A994bA120b); // BAL
        priceFeeds[0x0D8775F648430679A709E98d2b0Cb6250d2887EF] = AggregatorV3Interface(0x0d16d4528239e9ee52fa531af613AcdB23D88c94); // BAT
        priceFeeds[0x1F573D6Fb3F13d689FF844B4cE37794d79a7FF1C] = AggregatorV3Interface(0xCf61d1841B178fe82C8895fe60c2EDDa08314416); // BNT
        priceFeeds[0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599] = AggregatorV3Interface(0xdeb288F737066589598e9214E782fa5A8eD689e8); // WBTC = BTC
        priceFeeds[0x4Fabb145d64652a948d72533023f6E7A623C7C53] = AggregatorV3Interface(0x614715d2Af89E6EC99A233818275142cE88d1Cfd); // BUSD
        priceFeeds[0x56d811088235F11C8920698a204A5010a788f4b3] = AggregatorV3Interface(0x8f7C7181Ed1a2BA41cfC3f5d064eF91b67daef66); // BZRX
        priceFeeds[0xc00e94Cb662C3520282E6f5717214004A7f26888] = AggregatorV3Interface(0x1B39Ee86Ec5979ba5C322b826B3ECb8C79991699); // COMP
        priceFeeds[0xA0b73E1Ff0B80914AB6fe0444E65848C4C34450b] = AggregatorV3Interface(0xcA696a9Eb93b81ADFE6435759A29aB4cf2991A96); // CRO
        priceFeeds[0x6B175474E89094C44Da98b954EedeAC495271d0F] = AggregatorV3Interface(0x773616E4d11A78F511299002da57A0a94577F1f4); // DAI
        priceFeeds[0xEd91879919B71bB6905f23af0A68d231EcF87b14] = AggregatorV3Interface(0xD010e899f7ab723AC93f825cDC5Aa057669557c2); // DMG
        priceFeeds[0xF629cBd94d3791C9250152BD8dfBDF380E2a3B9c] = AggregatorV3Interface(0x24D9aB51950F3d62E9144fdC2f3135DAA6Ce8D1B); // ENJ
        priceFeeds[0xdd974D5C2e2928deA5F71b9825b8b646686BD200] = AggregatorV3Interface(0x656c0544eF4C98A6a98491833A89204Abb045d6b); // KNC
        priceFeeds[0x514910771AF9Ca656af840dff83E8264EcF986CA] = AggregatorV3Interface(0xDC530D9457755926550b59e8ECcdaE7624181557); // LINK
        priceFeeds[0xBBbbCA6A901c926F240b89EacB641d8Aec7AEafD] = AggregatorV3Interface(0x160AC928A16C93eD4895C2De6f81ECcE9a7eB7b4); // LRC
        priceFeeds[0x0F5D2fB29fb7d3CFeE444a200298f468908cC942] = AggregatorV3Interface(0x82A44D92D6c329826dc557c5E1Be6ebeC5D5FeB9); // MANA
        priceFeeds[0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2] = AggregatorV3Interface(0x24551a8Fb2A7211A25a17B1481f043A8a8adC7f2); // MKR
        priceFeeds[0xec67005c4E498Ec7f55E092bd1d35cbC47C91892] = AggregatorV3Interface(0xDaeA8386611A157B08829ED4997A8A62B557014C); // MLN
        priceFeeds[0x1776e1F26f98b1A5dF9cD347953a26dd3Cb46671] = AggregatorV3Interface(0x9cB2A01A7E64992d32A34db7cEea4c919C391f6A); // NMR
        priceFeeds[0x408e41876cCCDC0F92210600ef50372656052a38] = AggregatorV3Interface(0x3147D7203354Dc06D9fd350c7a2437bcA92387a4); // REN
        priceFeeds[0x221657776846890989a759BA2973e427DfF5C9bB] = AggregatorV3Interface(0xD4CE430C3b67b3E2F7026D86E7128588629e2455); // REP
        priceFeeds[0x607F4C5BB672230e8672085532f7e901544a7375] = AggregatorV3Interface(0x4cba1e1fdc738D0fe8DB3ee07728E2Bc4DA676c6); // RLC
        priceFeeds[0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F] = AggregatorV3Interface(0x79291A9d692Df95334B1a0B3B4AE6bC606782f8c); // SNX
        priceFeeds[0x57Ab1ec28D129707052df4dF418D58a2D46d5f51] = AggregatorV3Interface(0x8e0b7e6062272B5eF4524250bFFF8e5Bd3497757); // sUSD
        priceFeeds[0x0000000000085d4780B73119b644AE5ecd22b376] = AggregatorV3Interface(0x3886BA987236181D98F2401c507Fb8BeA7871dF2); // TUSD
        priceFeeds[0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828] = AggregatorV3Interface(0xf817B69EA583CAFF291E287CaE00Ea329d22765C); // UMA
        priceFeeds[0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984] = AggregatorV3Interface(0xD6aA3D25116d8dA79Ea0246c4826EB951872e02e); // UNI
        priceFeeds[0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48] = AggregatorV3Interface(0x986b5E1e1755e3C2440e960477f25201B0a8bbD4); // USDC
        priceFeeds[0xdAC17F958D2ee523a2206206994597C13D831ec7] = AggregatorV3Interface(0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46); // USDT
        priceFeeds[0x0d438F3b5175Bebc262bF23753C1E53d03432bDE] = AggregatorV3Interface(0xe5Dc0A609Ab8bCF15d3f35cFaa1Ff40f521173Ea); // WNXM
        priceFeeds[0xBd356a39BFf2cAda8E9248532DD879147221Cf76] = AggregatorV3Interface(0xcEBD2026d3C99F2a7CE028acf372C154aB4638a9); // WOM
        priceFeeds[0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e] = AggregatorV3Interface(0x7c5d4F8345e66f68099581Db340cd65B078C41f4); // YFI
        priceFeeds[0xE41d2489571d322189246DaFA5ebDe1F4699F498] = AggregatorV3Interface(0x2Da4983a622a8498bb1a21FaE9D8F6C664939962); // ZRX
    }

    function getUnderlyingPrice(CToken cToken) public view returns (uint) {
        if (cToken.isCEther() || CErc20(address(cToken)).underlying() == 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2) {
            return 1e18;
        } else {
            address underlying = CErc20(address(cToken)).underlying();
            (, int256 price, , , ) = priceFeeds[underlying].latestRoundData();
            uint256 underlyingDecimals = uint256(EIP20Interface(underlying).decimals());
            return price >= 0 ? (underlyingDecimals <= 18 ? mul(uint256(price), 10 ** (18 - underlyingDecimals)) : uint256(price) / (10 ** (underlyingDecimals - 18))) : 0;
        }
    }

    /// @dev Overflow proof multiplication
    function mul(uint a, uint b) internal pure returns (uint) {
        if (a == 0) return 0;
        uint c = a * b;
        require(c / a == b, "multiplication overflow");
        return c;
    }
}
