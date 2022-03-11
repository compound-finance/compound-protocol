pragma solidity ^0.5.16;

import "./CTokenInterface.sol";
import "./EIP20NonStandardInterface.sol";

contract CWrappedNativeInterface {

    /*** User Interface ***/

    function mint(uint mintAmount) external returns (uint);
    function mintNative() external payable returns (uint);
    function redeem(uint redeemTokens) external returns (uint);
    function redeemNative(uint redeemTokens) external returns (uint);
    function redeemUnderlying(uint redeemAmount) external returns (uint);
    function redeemUnderlyingNative(uint redeemAmount) external returns (uint);
    function borrow(uint borrowAmount) external returns (uint);
    function borrowNative(uint borrowAmount) external returns (uint);
    function repayBorrow(uint repayAmount) external returns (uint);
    function repayBorrowNative() external payable;
    function repayBorrowBehalf(address borrower, uint repayAmount) external returns (uint);
    function repayBorrowBehalfNative(address borrower) external payable;
    function liquidateBorrow(address borrower, uint repayAmount, CTokenInterface cTokenCollateral) external returns (uint);
    function sweepToken(EIP20NonStandardInterface token) external;


    /*** Admin Functions ***/

    function _addReserves(uint addAmount) external returns (uint);
}