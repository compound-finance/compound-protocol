pragma solidity ^0.5.16;

// Source: https://github.com/Uniswap/v2-core/blob/master/contracts/libraries/UQ112x112.sol
library UQ112x112 {
    uint224 constant Q112 = 2**112;

    // encode a uint112 as a UQ112x112
    function encode(uint112 y) internal pure returns (uint224 z) {
        z = uint224(y) * Q112; // never overflows
    }

    // divide a UQ112x112 by a uint112, returning a UQ112x112
    function uqdiv(uint224 x, uint112 y) internal pure returns (uint224 z) {
        z = x / uint224(y);
    }
}

contract UniswapPairHarness {
    using UQ112x112 for uint224;

    uint8 public constant decimals = 18;
    uint  public totalSupply;

    address public token0;
    address public token1;

    uint112 private reserve0;
    uint112 private reserve1;
    uint32  private blockTimestampLast;

    /// @notice mocked timestamp for tests
    uint private timestamp;

    uint public price0CumulativeLast;
    uint public price1CumulativeLast;
    uint public kLast; // reserve0 * reserve1, as of immediately after the most recent liquidity event

    constructor(address tokenA, address tokenB) public {
        (address token0_, address token1_) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);

        token0 = token0_;
        token1 = token1_;
    }

    function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }

    function harnessSetReserves(address tokenA, address tokenB, uint112 reserveA, uint112 reserveB) public {
        (uint112 reserve0_, uint112 reserve1_) = tokenA < tokenB ? (reserveA, reserveB) : (reserveB, reserveA);

        reserve0 = reserve0_;
        reserve1 = reserve1_;
    }

    function harnessUpdate() public {
        uint32 blockTimestamp = uint32(timestamp % 2**32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast; // overflow is desired
        if (timeElapsed > 0 && reserve0 != 0 && reserve1 != 0) {
            // * never overflows, and + overflow is desired
            price0CumulativeLast += uint(UQ112x112.encode(reserve1).uqdiv(reserve0)) * timeElapsed;
            price1CumulativeLast += uint(UQ112x112.encode(reserve0).uqdiv(reserve1)) * timeElapsed;
        }
        blockTimestampLast = blockTimestamp;
    }

    function setBlockTimestamp(uint timestamp_) public {
        timestamp = timestamp_;
    }
}
