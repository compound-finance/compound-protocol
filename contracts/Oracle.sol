pragma solidity ^0.5.16;

import "./PriceOracle.sol";

interface Feed {
    function decimals() external view returns (uint8);
    function latestAnswer() external view returns (uint);
}

contract Oracle is PriceOracle {

    struct FeedData {
        address addr;
        uint8 tokenDecimals;
    }

    address public owner;
    mapping (address => FeedData) public feeds; // cToken -> feed data
    mapping (address => uint) public fixedPrices; // cToken -> price
    uint8 constant DECIMALS = 36;

    modifier onlyOwner {
        require(msg.sender == owner, "ONLY OWNER");
        _;
    }

    constructor() public {
        owner = msg.sender;
    }

    function changeOwner(address owner_) public onlyOwner {
        owner = owner_;
    }

    function setFeed(CToken cToken_, address feed_, uint8 tokenDecimals_) public onlyOwner {
        feeds[address(cToken_)] = FeedData(feed_, tokenDecimals_);
    }

    function removeFeed(CToken cToken_) public onlyOwner {
        delete feeds[address(cToken_)];
    }

    function setFixedPrice(CToken cToken_, uint price) public onlyOwner {
        fixedPrices[address(cToken_)] = price;
    }

    function removeFixedPrice(CToken cToken_) public onlyOwner {
        delete fixedPrices[address(cToken_)];
    }

    function getUnderlyingPrice(CToken cToken_) public view returns (uint) {
        FeedData memory feed = feeds[address(cToken_)]; // gas savings
        if(feed.addr != address(0)) {
            uint decimals = uint(DECIMALS - feed.tokenDecimals - Feed(feed.addr).decimals());
            require(decimals <= DECIMALS, "DECIMAL UNDERFLOW");
            return Feed(feed.addr).latestAnswer() * (10 ** decimals);
        }

        return fixedPrices[address(cToken_)];
    }

}