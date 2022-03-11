pragma solidity ^0.5.16;

import "./InterestRateModel.sol";

contract CTokenInterface {
    /*** ERC20 ***/

    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);

    /*** User Interface ***/

    function transfer(address dst, uint amount) external returns (bool);
    function transferFrom(address src, address dst, uint amount) external returns (bool);
    function approve(address spender, uint amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint);
    function balanceOf(address owner) external view returns (uint);
    function balanceOfUnderlying(address owner) external returns (uint);
    function getAccountSnapshot(address account) external view returns (uint, uint, uint, uint);
    function borrowRatePerBlock() external view returns (uint);
    function supplyRatePerBlock() external view returns (uint);
    function totalBorrowsCurrent() external returns (uint);
    function borrowBalanceCurrent(address account) external returns (uint);
    function borrowBalanceStored(address account) external view returns (uint);
    function exchangeRateCurrent() external returns (uint);
    function exchangeRateStored() external view returns (uint);
    function getCash() external view returns (uint);
    function accrueInterest() external returns (uint);
    function seize(address liquidator, address borrower, uint seizeTokens) external returns (uint);

    /*** Admin Functions ***/

    function _setPendingAdmin(address payable newPendingAdmin) external returns (uint);
    function _acceptAdmin() external returns (uint);
    function _setComptroller(address newComptroller) external returns (uint);
    function _setReserveFactor(uint newReserveFactorMantissa) external returns (uint);
    function _reduceReserves(uint reduceAmount) external returns (uint);
    function _setInterestRateModel(InterestRateModel newInterestRateModel) external returns (uint);
    function _setFeeTaker(address payable newFeeTaker) external returns (uint);

    /*** Comptroller Functions ***/

    function isCToken() external view returns (bool);
    function accrualBlockNumber() external view returns (uint);
    function totalBorrows() external view returns (uint);
    function borrowIndex() external view returns (uint);
    function comptroller() external view returns (address);
    function totalSupply() external view returns (uint);
    function reserveFactorMantissa() external view returns (uint);
    function totalReserves() external view returns (uint);
}
