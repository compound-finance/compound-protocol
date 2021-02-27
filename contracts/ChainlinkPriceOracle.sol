pragma solidity ^0.5.16;

import "./PriceOracle.sol";
import "./BasePriceOracle.sol";
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

/**
 * @title PreferredPriceOracle
 * @notice Returns prices from Chainlink.
 * @dev Implements `PriceOracle`.
 * @author David Lucid <david@rari.capital>
 */
contract ChainlinkPriceOracle is PriceOracle, BasePriceOracle {
    /**
     * @notice Maps ERC20 token addresses to Chainlink price feed contracts.
     */
    mapping(address => AggregatorV3Interface) public priceFeeds;

    /**
     * @notice The maxmimum number of seconds elapsed since the round was last updated before the price is considered stale. If set to 0, no limit is enforced.
     */
    uint256 public maxSecondsBeforePriceIsStale;
    
    /**
     * @dev Constructor to set `maxSecondsBeforePriceIsStale` as well as all Chainlink price feeds.
     */
    constructor(uint256 _maxSecondsBeforePriceIsStale) public {
        // Set maxSecondsBeforePriceIsStale
        maxSecondsBeforePriceIsStale = _maxSecondsBeforePriceIsStale;

        // Set Chainlink price feeds
        priceFeeds[0x111111111117dc0aa78b770fa6a738034120c302] = AggregatorV3Interface(0x72AFAECF99C9d9C8215fF44C77B94B99C28741e8); // 1INCH
        priceFeeds[0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9] = AggregatorV3Interface(0x6Df09E975c830ECae5bd4eD9d90f3A95a4f88012); // AAVE
        priceFeeds[0xd46ba6d942050d489dbd938a2c909a5d5039a161] = AggregatorV3Interface(0x492575FDD11a0fCf2C6C719867890a7648d526eB); // AMPL
        priceFeeds[0xa117000000f279D81A1D3cc75430fAA017FA5A2e] = AggregatorV3Interface(0x8f83670260F8f7708143b836a2a6F11eF0aBac01); // ANT
        priceFeeds[0x3472A5A71965499acd81997a54BBA8D852C6E53d] = AggregatorV3Interface(0x58921Ac140522867bf50b9E009599Da0CA4A2379); // BADGER
        priceFeeds[0xba100000625a3754423978a60c9317c58a424e3D] = AggregatorV3Interface(0xC1438AA3823A6Ba0C159CfA8D98dF5A994bA120b); // BAL
        priceFeeds[0xba11d00c5f74255f56a5e366f4f77f5a186d7f55] = AggregatorV3Interface(0x0BDb051e10c9718d1C29efbad442E88D38958274); // BAND
        priceFeeds[0x0D8775F648430679A709E98d2b0Cb6250d2887EF] = AggregatorV3Interface(0x0d16d4528239e9ee52fa531af613AcdB23D88c94); // BAT
        priceFeeds[0xB8c77482e45F1F44dE1745F52C74426C631bDD52] = AggregatorV3Interface(0xc546d2d06144F9DD42815b8bA46Ee7B8FcAFa4a2); // BNB
        priceFeeds[0x617aecb6137b5108d1e7d4918e3725c8cebdb848] = AggregatorV3Interface(0xc546d2d06144F9DD42815b8bA46Ee7B8FcAFa4a2); // sBNB = BNB
        priceFeeds[0x1F573D6Fb3F13d689FF844B4cE37794d79a7FF1C] = AggregatorV3Interface(0xCf61d1841B178fe82C8895fe60c2EDDa08314416); // BNT
        priceFeeds[0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599] = AggregatorV3Interface(0xdeb288F737066589598e9214E782fa5A8eD689e8); // WBTC = BTC
        priceFeeds[0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D] = AggregatorV3Interface(0xdeb288F737066589598e9214E782fa5A8eD689e8); // renBTC = BTC
        priceFeeds[0xfE18be6b3Bd88A2D2A7f928d00292E7a9963CfC6] = AggregatorV3Interface(0xdeb288F737066589598e9214E782fa5A8eD689e8); // sBTC = BTC
        priceFeeds[0x4Fabb145d64652a948d72533023f6E7A623C7C53] = AggregatorV3Interface(0x614715d2Af89E6EC99A233818275142cE88d1Cfd); // BUSD
        priceFeeds[0x56d811088235F11C8920698a204A5010a788f4b3] = AggregatorV3Interface(0x8f7C7181Ed1a2BA41cfC3f5d064eF91b67daef66); // BZRX
        priceFeeds[0xaaaebe6fe48e54f431b0c390cfaf0b017d09d42d] = AggregatorV3Interface(0x75FbD83b4bd51dEe765b2a01e8D3aa1B020F9d33); // CEL
        priceFeeds[0xc00e94Cb662C3520282E6f5717214004A7f26888] = AggregatorV3Interface(0x1B39Ee86Ec5979ba5C322b826B3ECb8C79991699); // COMP
        priceFeeds[0x4688a8b1f292fdab17e9a90c8bc379dc1dbd8713] = AggregatorV3Interface(0x7B6230EF79D5E97C11049ab362c0b685faCBA0C2); // COVER
        priceFeeds[0x2ba592f78db6436527729929aaf6c908497cb200] = AggregatorV3Interface(0x82597CFE6af8baad7c0d441AA82cbC3b51759607); // CREAM
        priceFeeds[0xA0b73E1Ff0B80914AB6fe0444E65848C4C34450b] = AggregatorV3Interface(0xcA696a9Eb93b81ADFE6435759A29aB4cf2991A96); // CRO
        priceFeeds[0xD533a949740bb3306d119CC777fa900bA034cd52] = AggregatorV3Interface(0x8a12Be339B0cD1829b91Adc01977caa5E9ac121e); // CRV
        priceFeeds[0x6B175474E89094C44Da98b954EedeAC495271d0F] = AggregatorV3Interface(0x773616E4d11A78F511299002da57A0a94577F1f4); // DAI
        priceFeeds[0xEd91879919B71bB6905f23af0A68d231EcF87b14] = AggregatorV3Interface(0xD010e899f7ab723AC93f825cDC5Aa057669557c2); // DMG
        priceFeeds[0x1494ca1f11d487c2bbe4543e90080aeba4ba3c2b] = AggregatorV3Interface(0x029849bbc0b1d93b85a8b6190e979fd38F5760E2); // DPI
        priceFeeds[0xF629cBd94d3791C9250152BD8dfBDF380E2a3B9c] = AggregatorV3Interface(0x24D9aB51950F3d62E9144fdC2f3135DAA6Ce8D1B); // ENJ
        priceFeeds[0x4e15361fd6b4bb609fa63c81a2be19d873717870] = AggregatorV3Interface(0x2DE7E4a9488488e0058B95854CC2f7955B35dC9b); // FTM
        priceFeeds[0x50d1c9771902476076ecfc8b2a83ad6b9355a4c9] = AggregatorV3Interface(0xF0985f7E2CaBFf22CecC5a71282a89582c382EFE); // FTT
        priceFeeds[0xc944e90c64b2c07662a292be6244bdf05cda44a7] = AggregatorV3Interface(0x17D054eCac33D91F7340645341eFB5DE9009F1C1); // GRT
        priceFeeds[0x584bC13c7D411c00c01A62e8019472dE68768430] = AggregatorV3Interface(0xAf5E8D9Cd9fC85725A83BF23C52f1C39A71588a6); // HEGIC
        priceFeeds[0xdd974D5C2e2928deA5F71b9825b8b646686BD200] = AggregatorV3Interface(0x656c0544eF4C98A6a98491833A89204Abb045d6b); // KNC
        priceFeeds[0x1ceb5cb57c4d4e2b2433641b95dd330a33185a44] = AggregatorV3Interface(0xe7015CCb7E5F788B8c1010FC22343473EaaC3741); // KP3R
        priceFeeds[0x514910771AF9Ca656af840dff83E8264EcF986CA] = AggregatorV3Interface(0xDC530D9457755926550b59e8ECcdaE7624181557); // LINK
        priceFeeds[0xBBbbCA6A901c926F240b89EacB641d8Aec7AEafD] = AggregatorV3Interface(0x160AC928A16C93eD4895C2De6f81ECcE9a7eB7b4); // LRC
        priceFeeds[0x0F5D2fB29fb7d3CFeE444a200298f468908cC942] = AggregatorV3Interface(0x82A44D92D6c329826dc557c5E1Be6ebeC5D5FeB9); // MANA
        priceFeeds[0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2] = AggregatorV3Interface(0x24551a8Fb2A7211A25a17B1481f043A8a8adC7f2); // MKR
        priceFeeds[0xec67005c4E498Ec7f55E092bd1d35cbC47C91892] = AggregatorV3Interface(0xDaeA8386611A157B08829ED4997A8A62B557014C); // MLN
        priceFeeds[0xa3BeD4E1c75D00fa6f4E5E6922DB7261B5E9AcD2] = AggregatorV3Interface(0x98334b85De2A8b998Ba844c5521e73D68AD69C00); // MTA
        priceFeeds[0x1776e1F26f98b1A5dF9cD347953a26dd3Cb46671] = AggregatorV3Interface(0x9cB2A01A7E64992d32A34db7cEea4c919C391f6A); // NMR
        priceFeeds[0xd26114cd6EE289AccF82350c8d8487fedB8A0C07] = AggregatorV3Interface(0x57C9aB3e56EE4a83752c181f241120a3DBba06a1); // OMG
        priceFeeds[0x0258f474786ddfd37abce6df6bbb1dd5dfc4434a] = AggregatorV3Interface(0xbA9B2a360eb8aBdb677d6d7f27E12De11AA052ef); // ORN
        priceFeeds[0x8e870d67f660d95d5be530380d0ec0bd388289e1] = AggregatorV3Interface(0x3a08ebBaB125224b7b6474384Ee39fBb247D2200); // PAX
        priceFeeds[0x45804880De22913dAFE09f4980848ECE6EcbAf78] = AggregatorV3Interface(0x9B97304EA12EFed0FAd976FBeCAad46016bf269e); // PAXG
        priceFeeds[0x408e41876cCCDC0F92210600ef50372656052a38] = AggregatorV3Interface(0x3147D7203354Dc06D9fd350c7a2437bcA92387a4); // REN
        priceFeeds[0x221657776846890989a759BA2973e427DfF5C9bB] = AggregatorV3Interface(0xD4CE430C3b67b3E2F7026D86E7128588629e2455); // REP
        priceFeeds[0x607F4C5BB672230e8672085532f7e901544a7375] = AggregatorV3Interface(0x4cba1e1fdc738D0fe8DB3ee07728E2Bc4DA676c6); // RLC
        priceFeeds[0x3155ba85d5f96b2d030a4966af206230e46849cb] = AggregatorV3Interface(0x875D60C44cfbC38BaA4Eb2dDB76A767dEB91b97e); // RUNE
        priceFeeds[0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F] = AggregatorV3Interface(0x79291A9d692Df95334B1a0B3B4AE6bC606782f8c); // SNX
        priceFeeds[0x476c5E26a75bd202a9683ffD34359C0CC15be0fF] = AggregatorV3Interface(0x050c048c9a0CD0e76f166E2539F87ef2acCEC58f); // SRM
        priceFeeds[0x57Ab1ec28D129707052df4dF418D58a2D46d5f51] = AggregatorV3Interface(0x8e0b7e6062272B5eF4524250bFFF8e5Bd3497757); // sUSD
        priceFeeds[0x6b3595068778dd592e39a122f4f5a5cf09c90fe2] = AggregatorV3Interface(0xe572CeF69f43c2E488b33924AF04BDacE19079cf); // SUSHI
        priceFeeds[0x0000000000085d4780B73119b644AE5ecd22b376] = AggregatorV3Interface(0x3886BA987236181D98F2401c507Fb8BeA7871dF2); // TUSD
        priceFeeds[0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828] = AggregatorV3Interface(0xf817B69EA583CAFF291E287CaE00Ea329d22765C); // UMA
        priceFeeds[0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984] = AggregatorV3Interface(0xD6aA3D25116d8dA79Ea0246c4826EB951872e02e); // UNI
        priceFeeds[0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48] = AggregatorV3Interface(0x986b5E1e1755e3C2440e960477f25201B0a8bbD4); // USDC
        priceFeeds[0xdAC17F958D2ee523a2206206994597C13D831ec7] = AggregatorV3Interface(0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46); // USDT
        priceFeeds[0xa47c8bf37f92abed4a126bda807a7b7498661acd] = AggregatorV3Interface(0xa20623070413d42a5C01Db2c8111640DD7A5A03a); // UST
        priceFeeds[0x0d438F3b5175Bebc262bF23753C1E53d03432bDE] = AggregatorV3Interface(0xe5Dc0A609Ab8bCF15d3f35cFaa1Ff40f521173Ea); // WNXM
        priceFeeds[0xBd356a39BFf2cAda8E9248532DD879147221Cf76] = AggregatorV3Interface(0xcEBD2026d3C99F2a7CE028acf372C154aB4638a9); // WOM
        priceFeeds[0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e] = AggregatorV3Interface(0x7c5d4F8345e66f68099581Db340cd65B078C41f4); // YFI
        priceFeeds[0xa1d0E215a23d7030842FC67cE582a6aFa3CCaB83] = AggregatorV3Interface(0xaaB2f6b45B28E962B3aCd1ee4fC88aEdDf557756); // YFII
        priceFeeds[0xE41d2489571d322189246DaFA5ebDe1F4699F498] = AggregatorV3Interface(0x2Da4983a622a8498bb1a21FaE9D8F6C664939962); // ZRX
    }

    /**
     * @dev Returns the price in ETH of `underlying`.
     */
    function _price(address underlying) internal view returns (uint) {
        // Return 1e18 for WETH
        if (underlying == 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2) return 1e18;

        // Get token/ETH price from Chainlink
        require(address(priceFeeds[underlying]) != address(0), "No Chainlink price feed found for this underlying ERC20 token.");
        (, int256 chainlinkPrice, , uint256 updatedAt, ) = priceFeeds[underlying].latestRoundData();
        if (maxSecondsBeforePriceIsStale > 0) require(block.timestamp <= updatedAt + maxSecondsBeforePriceIsStale, "Chainlink price is stale.");
        return chainlinkPrice >= 0 ? uint256(chainlinkPrice) : 0;
    }

    /**
     * @dev Returns the price in ETH of `underlying` (implements `BasePriceOracle`).
     */
    function price(address underlying) external view returns (uint) {
        return _price(underlying);
    }

    /**
     * @dev Returns the price in ETH of the token underlying `cToken` (implements `PriceOracle`).
     */
    function getUnderlyingPrice(CToken cToken) external view returns (uint) {
        // Return 1e18 for ETH
        if (cToken.isCEther()) return 1e18;

        // Get underlying token address
        address underlying = CErc20(address(cToken)).underlying();

        // Get price
        uint256 chainlinkPrice = _price(underlying);

        // Format and return price
        uint256 underlyingDecimals = uint256(EIP20Interface(underlying).decimals());
        return underlyingDecimals <= 18 ? mul(uint256(chainlinkPrice), 10 ** (18 - underlyingDecimals)) : uint256(chainlinkPrice) / (10 ** (underlyingDecimals - 18));
    }

    /// @dev Overflow proof multiplication
    function mul(uint a, uint b) internal pure returns (uint) {
        if (a == 0) return 0;
        uint c = a * b;
        require(c / a == b, "multiplication overflow");
        return c;
    }
}
