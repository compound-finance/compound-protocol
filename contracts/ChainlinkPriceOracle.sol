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
     * @notice Maps ERC20 token addresses to ETH-based Chainlink price feed contracts.
     */
    mapping(address => AggregatorV3Interface) public ethPriceFeeds;

    /**
     * @notice Maps ERC20 token addresses to USD-based Chainlink price feed contracts.
     */
    mapping(address => AggregatorV3Interface) public usdPriceFeeds;

    /**
     * @notice Maps ERC20 token addresses to BTC-based Chainlink price feed contracts.
     */
    mapping(address => AggregatorV3Interface) public btcPriceFeeds;

    /**
     * @notice Chainlink ETH/USD price feed contracts.
     */
    AggregatorV3Interface ethUsdPriceFeed = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);

    /**
     * @notice Chainlink BTC/ETH price feed contracts.
     */
    AggregatorV3Interface btcEthPriceFeed = AggregatorV3Interface(0xdeb288F737066589598e9214E782fa5A8eD689e8);

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

        // Set Chainlink ETH price feeds
        ethPriceFeeds[0x111111111117dC0aa78b770fA6A738034120C302] = AggregatorV3Interface(0x72AFAECF99C9d9C8215fF44C77B94B99C28741e8); // 1INCH
        ethPriceFeeds[0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9] = AggregatorV3Interface(0x6Df09E975c830ECae5bd4eD9d90f3A95a4f88012); // AAVE
        ethPriceFeeds[0xD46bA6D942050d489DBd938a2C909A5d5039A161] = AggregatorV3Interface(0x492575FDD11a0fCf2C6C719867890a7648d526eB); // AMPL
        ethPriceFeeds[0xa117000000f279D81A1D3cc75430fAA017FA5A2e] = AggregatorV3Interface(0x8f83670260F8f7708143b836a2a6F11eF0aBac01); // ANT
        ethPriceFeeds[0x3472A5A71965499acd81997a54BBA8D852C6E53d] = AggregatorV3Interface(0x58921Ac140522867bf50b9E009599Da0CA4A2379); // BADGER
        ethPriceFeeds[0xba100000625a3754423978a60c9317c58a424e3D] = AggregatorV3Interface(0xC1438AA3823A6Ba0C159CfA8D98dF5A994bA120b); // BAL
        ethPriceFeeds[0xBA11D00c5f74255f56a5E366F4F77f5A186d7f55] = AggregatorV3Interface(0x0BDb051e10c9718d1C29efbad442E88D38958274); // BAND
        ethPriceFeeds[0x0D8775F648430679A709E98d2b0Cb6250d2887EF] = AggregatorV3Interface(0x0d16d4528239e9ee52fa531af613AcdB23D88c94); // BAT
        ethPriceFeeds[0xB8c77482e45F1F44dE1745F52C74426C631bDD52] = AggregatorV3Interface(0xc546d2d06144F9DD42815b8bA46Ee7B8FcAFa4a2); // BNB
        ethPriceFeeds[0x617aeCB6137B5108D1E7D4918e3725C8cEbdB848] = AggregatorV3Interface(0xc546d2d06144F9DD42815b8bA46Ee7B8FcAFa4a2); // sBNB = BNB
        ethPriceFeeds[0x1F573D6Fb3F13d689FF844B4cE37794d79a7FF1C] = AggregatorV3Interface(0xCf61d1841B178fe82C8895fe60c2EDDa08314416); // BNT
        ethPriceFeeds[0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599] = AggregatorV3Interface(0xdeb288F737066589598e9214E782fa5A8eD689e8); // WBTC = BTC
        ethPriceFeeds[0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D] = AggregatorV3Interface(0xdeb288F737066589598e9214E782fa5A8eD689e8); // renBTC = BTC
        ethPriceFeeds[0xfE18be6b3Bd88A2D2A7f928d00292E7a9963CfC6] = AggregatorV3Interface(0xdeb288F737066589598e9214E782fa5A8eD689e8); // sBTC = BTC
        ethPriceFeeds[0x4Fabb145d64652a948d72533023f6E7A623C7C53] = AggregatorV3Interface(0x614715d2Af89E6EC99A233818275142cE88d1Cfd); // BUSD
        ethPriceFeeds[0x56d811088235F11C8920698a204A5010a788f4b3] = AggregatorV3Interface(0x8f7C7181Ed1a2BA41cfC3f5d064eF91b67daef66); // BZRX
        ethPriceFeeds[0xaaAEBE6Fe48E54f431b0C390CfaF0b017d09D42d] = AggregatorV3Interface(0x75FbD83b4bd51dEe765b2a01e8D3aa1B020F9d33); // CEL
        ethPriceFeeds[0xc00e94Cb662C3520282E6f5717214004A7f26888] = AggregatorV3Interface(0x1B39Ee86Ec5979ba5C322b826B3ECb8C79991699); // COMP
        ethPriceFeeds[0x4688a8b1F292FDaB17E9a90c8Bc379dC1DBd8713] = AggregatorV3Interface(0x7B6230EF79D5E97C11049ab362c0b685faCBA0C2); // COVER
        ethPriceFeeds[0x2ba592F78dB6436527729929AAf6c908497cB200] = AggregatorV3Interface(0x82597CFE6af8baad7c0d441AA82cbC3b51759607); // CREAM
        ethPriceFeeds[0xA0b73E1Ff0B80914AB6fe0444E65848C4C34450b] = AggregatorV3Interface(0xcA696a9Eb93b81ADFE6435759A29aB4cf2991A96); // CRO
        ethPriceFeeds[0xD533a949740bb3306d119CC777fa900bA034cd52] = AggregatorV3Interface(0x8a12Be339B0cD1829b91Adc01977caa5E9ac121e); // CRV
        ethPriceFeeds[0x6B175474E89094C44Da98b954EedeAC495271d0F] = AggregatorV3Interface(0x773616E4d11A78F511299002da57A0a94577F1f4); // DAI
        ethPriceFeeds[0xEd91879919B71bB6905f23af0A68d231EcF87b14] = AggregatorV3Interface(0xD010e899f7ab723AC93f825cDC5Aa057669557c2); // DMG
        ethPriceFeeds[0x1494CA1F11D487c2bBe4543E90080AeBa4BA3C2b] = AggregatorV3Interface(0x029849bbc0b1d93b85a8b6190e979fd38F5760E2); // DPI
        ethPriceFeeds[0xF629cBd94d3791C9250152BD8dfBDF380E2a3B9c] = AggregatorV3Interface(0x24D9aB51950F3d62E9144fdC2f3135DAA6Ce8D1B); // ENJ
        ethPriceFeeds[0x4E15361FD6b4BB609Fa63C81A2be19d873717870] = AggregatorV3Interface(0x2DE7E4a9488488e0058B95854CC2f7955B35dC9b); // FTM
        ethPriceFeeds[0x50D1c9771902476076eCFc8B2A83Ad6b9355a4c9] = AggregatorV3Interface(0xF0985f7E2CaBFf22CecC5a71282a89582c382EFE); // FTT
        ethPriceFeeds[0xc944E90C64B2c07662A292be6244BDf05Cda44a7] = AggregatorV3Interface(0x17D054eCac33D91F7340645341eFB5DE9009F1C1); // GRT
        ethPriceFeeds[0x584bC13c7D411c00c01A62e8019472dE68768430] = AggregatorV3Interface(0xAf5E8D9Cd9fC85725A83BF23C52f1C39A71588a6); // HEGIC
        ethPriceFeeds[0xdd974D5C2e2928deA5F71b9825b8b646686BD200] = AggregatorV3Interface(0x656c0544eF4C98A6a98491833A89204Abb045d6b); // KNC
        ethPriceFeeds[0x1cEB5cB57C4D4E2b2433641b95Dd330A33185A44] = AggregatorV3Interface(0xe7015CCb7E5F788B8c1010FC22343473EaaC3741); // KP3R
        ethPriceFeeds[0x514910771AF9Ca656af840dff83E8264EcF986CA] = AggregatorV3Interface(0xDC530D9457755926550b59e8ECcdaE7624181557); // LINK
        ethPriceFeeds[0xBBbbCA6A901c926F240b89EacB641d8Aec7AEafD] = AggregatorV3Interface(0x160AC928A16C93eD4895C2De6f81ECcE9a7eB7b4); // LRC
        ethPriceFeeds[0x0F5D2fB29fb7d3CFeE444a200298f468908cC942] = AggregatorV3Interface(0x82A44D92D6c329826dc557c5E1Be6ebeC5D5FeB9); // MANA
        ethPriceFeeds[0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2] = AggregatorV3Interface(0x24551a8Fb2A7211A25a17B1481f043A8a8adC7f2); // MKR
        ethPriceFeeds[0xec67005c4E498Ec7f55E092bd1d35cbC47C91892] = AggregatorV3Interface(0xDaeA8386611A157B08829ED4997A8A62B557014C); // MLN
        ethPriceFeeds[0xa3BeD4E1c75D00fa6f4E5E6922DB7261B5E9AcD2] = AggregatorV3Interface(0x98334b85De2A8b998Ba844c5521e73D68AD69C00); // MTA
        ethPriceFeeds[0x1776e1F26f98b1A5dF9cD347953a26dd3Cb46671] = AggregatorV3Interface(0x9cB2A01A7E64992d32A34db7cEea4c919C391f6A); // NMR
        ethPriceFeeds[0xd26114cd6EE289AccF82350c8d8487fedB8A0C07] = AggregatorV3Interface(0x57C9aB3e56EE4a83752c181f241120a3DBba06a1); // OMG
        ethPriceFeeds[0x0258F474786DdFd37ABCE6df6BBb1Dd5dfC4434a] = AggregatorV3Interface(0xbA9B2a360eb8aBdb677d6d7f27E12De11AA052ef); // ORN
        ethPriceFeeds[0x8E870D67F660D95d5be530380D0eC0bd388289E1] = AggregatorV3Interface(0x3a08ebBaB125224b7b6474384Ee39fBb247D2200); // PAX
        ethPriceFeeds[0x45804880De22913dAFE09f4980848ECE6EcbAf78] = AggregatorV3Interface(0x9B97304EA12EFed0FAd976FBeCAad46016bf269e); // PAXG
        ethPriceFeeds[0x408e41876cCCDC0F92210600ef50372656052a38] = AggregatorV3Interface(0x3147D7203354Dc06D9fd350c7a2437bcA92387a4); // REN
        ethPriceFeeds[0x221657776846890989a759BA2973e427DfF5C9bB] = AggregatorV3Interface(0xD4CE430C3b67b3E2F7026D86E7128588629e2455); // REP
        ethPriceFeeds[0x607F4C5BB672230e8672085532f7e901544a7375] = AggregatorV3Interface(0x4cba1e1fdc738D0fe8DB3ee07728E2Bc4DA676c6); // RLC
        ethPriceFeeds[0x3155BA85D5F96b2d030a4966AF206230e46849cb] = AggregatorV3Interface(0x875D60C44cfbC38BaA4Eb2dDB76A767dEB91b97e); // RUNE
        ethPriceFeeds[0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F] = AggregatorV3Interface(0x79291A9d692Df95334B1a0B3B4AE6bC606782f8c); // SNX
        ethPriceFeeds[0x476c5E26a75bd202a9683ffD34359C0CC15be0fF] = AggregatorV3Interface(0x050c048c9a0CD0e76f166E2539F87ef2acCEC58f); // SRM
        ethPriceFeeds[0x57Ab1ec28D129707052df4dF418D58a2D46d5f51] = AggregatorV3Interface(0x8e0b7e6062272B5eF4524250bFFF8e5Bd3497757); // sUSD
        ethPriceFeeds[0x6B3595068778DD592e39A122f4f5a5cF09C90fE2] = AggregatorV3Interface(0xe572CeF69f43c2E488b33924AF04BDacE19079cf); // SUSHI
        ethPriceFeeds[0x0000000000085d4780B73119b644AE5ecd22b376] = AggregatorV3Interface(0x3886BA987236181D98F2401c507Fb8BeA7871dF2); // TUSD
        ethPriceFeeds[0x04Fa0d235C4abf4BcF4787aF4CF447DE572eF828] = AggregatorV3Interface(0xf817B69EA583CAFF291E287CaE00Ea329d22765C); // UMA
        ethPriceFeeds[0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984] = AggregatorV3Interface(0xD6aA3D25116d8dA79Ea0246c4826EB951872e02e); // UNI
        ethPriceFeeds[0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48] = AggregatorV3Interface(0x986b5E1e1755e3C2440e960477f25201B0a8bbD4); // USDC
        ethPriceFeeds[0xdAC17F958D2ee523a2206206994597C13D831ec7] = AggregatorV3Interface(0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46); // USDT
        ethPriceFeeds[0xa47c8bf37f92aBed4A126BDA807A7b7498661acD] = AggregatorV3Interface(0xa20623070413d42a5C01Db2c8111640DD7A5A03a); // UST
        ethPriceFeeds[0x0d438F3b5175Bebc262bF23753C1E53d03432bDE] = AggregatorV3Interface(0xe5Dc0A609Ab8bCF15d3f35cFaa1Ff40f521173Ea); // WNXM
        ethPriceFeeds[0xBd356a39BFf2cAda8E9248532DD879147221Cf76] = AggregatorV3Interface(0xcEBD2026d3C99F2a7CE028acf372C154aB4638a9); // WOM
        ethPriceFeeds[0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e] = AggregatorV3Interface(0x7c5d4F8345e66f68099581Db340cd65B078C41f4); // YFI
        ethPriceFeeds[0xa1d0E215a23d7030842FC67cE582a6aFa3CCaB83] = AggregatorV3Interface(0xaaB2f6b45B28E962B3aCd1ee4fC88aEdDf557756); // YFII
        ethPriceFeeds[0xE41d2489571d322189246DaFA5ebDe1F4699F498] = AggregatorV3Interface(0x2Da4983a622a8498bb1a21FaE9D8F6C664939962); // ZRX

        // USD price feeds
        usdPriceFeeds[0xe36E2D3c7c34281FA3bC737950a68571736880A1] = AggregatorV3Interface(0xAE48c91dF1fE419994FFDa27da09D5aC69c30f55); // sADA = ADA
        usdPriceFeeds[0xADE00C28244d5CE17D72E40330B1c318cD12B7c3] = AggregatorV3Interface(0x231e764B44b2C1b7Ca171fa8021A24ed520Cde10); // ADX
        usdPriceFeeds[0xF48e200EAF9906362BB1442fca31e0835773b8B4] = AggregatorV3Interface(0x77F9710E7d0A19669A13c055F62cd80d313dF022); // sAUD = AUD
        usdPriceFeeds[0x0F83287FF768D1c1e17a42F44d644D7F22e8ee1d] = AggregatorV3Interface(0x449d117117838fFA61263B61dA6301AA2a88B13A); // sCHF = CHF
        usdPriceFeeds[0xfE33ae95A9f0DA8A845aF33516EDc240DCD711d6] = AggregatorV3Interface(0xFb0cADFEa136E9E343cfb55B863a6Df8348ab912); // sDASH = DASH
        usdPriceFeeds[0x1715AC0743102BF5Cd58EfBB6Cf2dC2685d967b6] = AggregatorV3Interface(0x1C07AFb8E2B827c5A4739C6d59Ae3A5035f28734); // sDOT = DOT
        usdPriceFeeds[0x88C8Cf3A212c0369698D13FE98Fcb76620389841] = AggregatorV3Interface(0x10a43289895eAff840E8d45995BBa89f9115ECEe); // sEOS = EOS
        usdPriceFeeds[0x22602469d704BfFb0936c7A7cfcD18f7aA269375] = AggregatorV3Interface(0xaEA2808407B7319A31A383B6F8B60f04BCa23cE2); // sETC = ETC
        usdPriceFeeds[0xD71eCFF9342A5Ced620049e616c5035F1dB98620] = AggregatorV3Interface(0xb49f677943BC038e9857d61E7d053CaA2C1734C1); // sEUR = EUR
        usdPriceFeeds[0xeF9Cd7882c067686691B6fF49e650b43AFBBCC6B] = AggregatorV3Interface(0x80070f7151BdDbbB1361937ad4839317af99AE6c); // FNX
        usdPriceFeeds[0x97fe22E7341a0Cd8Db6F6C021A24Dc8f4DAD855F] = AggregatorV3Interface(0x5c0Ab2d9b5a7ed9f470386e82BB36A3613cDd4b5); // sGBP = GBP
        usdPriceFeeds[0xFA1a856Cfa3409CFa145Fa4e20Eb270dF3EB21ab] = AggregatorV3Interface(0xd0935838935349401c73a06FCde9d63f719e84E5); // IOST
        usdPriceFeeds[0xC14103C2141E842e228FBaC594579e798616ce7A] = AggregatorV3Interface(0x6AF09DF7563C363B5763b9102712EbeD3b9e859B); // sLTC = LTC
        usdPriceFeeds[0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0] = AggregatorV3Interface(0x7bAC85A8a13A4BcD8abb3eB7d6b4d632c5a57676); // MATIC
        usdPriceFeeds[0x4575f41308EC1483f3d399aa9a2826d74Da13Deb] = AggregatorV3Interface(0xd75AAaE4AF0c398ca13e2667Be57AF2ccA8B5de6); // OXT
        usdPriceFeeds[0x8CE9137d39326AD0cD6491fb5CC0CbA0e089b6A9] = AggregatorV3Interface(0xFb0CfD6c19e25DB4a08D8a204a387cEa48Cc138f); // SXP
        usdPriceFeeds[0x4C19596f5aAfF459fA38B0f7eD92F11AE6543784] = AggregatorV3Interface(0x26929b85fE284EeAB939831002e1928183a10fb1); // TRU
        usdPriceFeeds[0xf2E08356588EC5cd9E437552Da87C0076b4970B0] = AggregatorV3Interface(0xacD0D1A29759CC01E8D925371B72cb2b5610EA25); // sTRX = TRX
        usdPriceFeeds[0x918dA91Ccbc32B7a6A0cc4eCd5987bbab6E31e6D] = AggregatorV3Interface(0x1ceDaaB50936881B3e449e47e40A2cDAF5576A4a); // sTSLA = TSLA
        usdPriceFeeds[0x1c48f86ae57291F7686349F12601910BD8D470bb] = AggregatorV3Interface(0xfAC81Ea9Dd29D8E9b212acd6edBEb6dE38Cb43Af); // USDK
        usdPriceFeeds[0x6A22e5e94388464181578Aa7A6B869e00fE27846] = AggregatorV3Interface(0x379589227b15F1a12195D3f2d90bBc9F31f95235); // sXAG = XAG
        usdPriceFeeds[0x261EfCdD24CeA98652B9700800a13DfBca4103fF] = AggregatorV3Interface(0x214eD9Da11D2fbe465a6fc601a91E62EbEc1a0D6); // sXAU = XAU
        usdPriceFeeds[0x5299d6F7472DCc137D7f3C4BcfBBB514BaBF341A] = AggregatorV3Interface(0xFA66458Cce7Dd15D8650015c4fce4D278271618F); // sXMR = XMR
        usdPriceFeeds[0xa2B0fDe6D710e201d0d608e924A484d1A5fEd57c] = AggregatorV3Interface(0xCed2660c6Dd1Ffd856A5A82C67f3482d88C50b12); // sXRP = XRP
        usdPriceFeeds[0x2e59005c5c0f0a4D77CcA82653d48b46322EE5Cd] = AggregatorV3Interface(0x5239a625dEb44bF3EeAc2CD5366ba24b8e9DB63F); // sXTZ = XTZ
        usdPriceFeeds[0xeABACD844A196D7Faf3CE596edeBF9900341B420] = AggregatorV3Interface(0x283D433435cFCAbf00263beEF6A362b7cc5ed9f2); // sCEX
        usdPriceFeeds[0xe1aFe1Fd76Fd88f78cBf599ea1846231B8bA3B6B] = AggregatorV3Interface(0xa8E875F94138B0C5b51d1e1d5dE35bbDdd28EA87); // sDEFI

        // BTC price feeds
        btcPriceFeeds[0x798D1bE841a82a273720CE31c822C61a67a601C3] = AggregatorV3Interface(0x418a6C98CD5B8275955f08F0b8C1c6838c8b1685); // DIGG
        btcPriceFeeds[0xF970b8E36e23F7fC3FD752EeA86f8Be8D83375A6] = AggregatorV3Interface(0xEa0b3DCa635f4a4E77D9654C5c18836EE771566e); // RCN
    }

    /**
     * @dev Returns a boolean indicating if a price feed exists for the underlying asset.
     */
    function hasPriceFeed(address underlying) external view returns (bool) {
        return address(ethPriceFeeds[underlying]) != address(0) || address(usdPriceFeeds[underlying]) != address(0) || address(btcPriceFeeds[underlying]) != address(0);
    }

    /**
     * @dev Returns the price in ETH of `underlying`.
     */
    function _price(address underlying) internal view returns (uint) {
        // Return 1e18 for WETH
        if (underlying == 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2) return 1e18;

        // Get token/ETH price from Chainlink
        if (address(ethPriceFeeds[underlying]) != address(0)) {
            (, int256 tokenEthPrice, , uint256 updatedAt, ) = ethPriceFeeds[underlying].latestRoundData();
            if (maxSecondsBeforePriceIsStale > 0) require(block.timestamp <= updatedAt + maxSecondsBeforePriceIsStale, "Token/ETH Chainlink price is stale.");
            return tokenEthPrice >= 0 ? uint256(tokenEthPrice) : 0;
        } else if (address(usdPriceFeeds[underlying]) != address(0)) {
            (, int256 ethUsdPrice, , uint256 updatedAt, ) = ethUsdPriceFeed.latestRoundData();
            if (maxSecondsBeforePriceIsStale > 0) require(block.timestamp <= updatedAt + maxSecondsBeforePriceIsStale, "ETH/USD Chainlink price is stale.");
            if (ethUsdPrice <= 0) return 0;
            int256 tokenUsdPrice;
            (, tokenUsdPrice, , updatedAt, ) = usdPriceFeeds[underlying].latestRoundData();
            if (maxSecondsBeforePriceIsStale > 0) require(block.timestamp <= updatedAt + maxSecondsBeforePriceIsStale, "Token/USD Chainlink price is stale.");
            return tokenUsdPrice >= 0 ? mul(uint256(tokenUsdPrice), 1e18) / uint256(ethUsdPrice) : 0;
        } else if (address(btcPriceFeeds[underlying]) != address(0)) {
            (, int256 btcEthPrice, , uint256 updatedAt, ) = btcEthPriceFeed.latestRoundData();
            if (maxSecondsBeforePriceIsStale > 0) require(block.timestamp <= updatedAt + maxSecondsBeforePriceIsStale, "BTC/ETH Chainlink price is stale.");
            if (btcEthPrice <= 0) return 0;
            int256 tokenBtcPrice;
            (, tokenBtcPrice, , updatedAt, ) = btcPriceFeeds[underlying].latestRoundData();
            if (maxSecondsBeforePriceIsStale > 0) require(block.timestamp <= updatedAt + maxSecondsBeforePriceIsStale, "Token/BTC Chainlink price is stale.");
            return tokenBtcPrice >= 0 ? mul(uint256(tokenBtcPrice), uint256(btcEthPrice)) / 1e8 : 0;
        } else revert("No Chainlink price feed found for this underlying ERC20 token.");
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
