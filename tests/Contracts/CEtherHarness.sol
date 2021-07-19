pragma solidity ^0.5.16;

import "../../contracts/CEtherDelegator.sol";
import "../../contracts/CEtherDelegate.sol";
import "./ComptrollerHarness.sol";

contract CEtherDelegateHarness is CEtherDelegate {
    event Log(string x, address y);
    event Log(string x, uint y);

    uint blockNumber = 100000;
    uint harnessExchangeRate;
    bool harnessExchangeRateStored;

    mapping (address => bool) public failTransferToAddresses;

    function exchangeRateStoredInternal() internal view returns (MathError, uint) {
        if (harnessExchangeRateStored) {
            return (MathError.NO_ERROR, harnessExchangeRate);
        }
        return super.exchangeRateStoredInternal();
    }

    function doTransferOut(address payable to, uint amount) internal {
        require(failTransferToAddresses[to] == false, "TOKEN_TRANSFER_OUT_FAILED");
        return super.doTransferOut(to, amount);
    }

    function getBlockNumber() internal view returns (uint) {
        return blockNumber;
    }

    function getBorrowRateMaxMantissa() public pure returns (uint) {
        return borrowRateMaxMantissa;
    }

    function harnessSetBlockNumber(uint newBlockNumber) public {
        blockNumber = newBlockNumber;
    }

    function harnessFastForward(uint blocks) public {
        blockNumber += blocks;
    }

    function harnessSetBalance(address account, uint amount) external {
        accountTokens[account] = amount;
    }

    function harnessSetAccrualBlockNumber(uint _accrualblockNumber) public {
        accrualBlockNumber = _accrualblockNumber;
    }

    function harnessSetTotalSupply(uint totalSupply_) public {
        totalSupply = totalSupply_;
    }

    function harnessSetTotalBorrows(uint totalBorrows_) public {
        totalBorrows = totalBorrows_;
    }

    function harnessSetTotalReserves(uint totalReserves_) public {
        totalReserves = totalReserves_;
    }

    function harnessSetTotalAdminFees(uint totalAdminFees_) public {
        totalAdminFees = totalAdminFees_;
    }

    function harnessSetTotalFuseFees(uint totalFuseFees_) public {
        totalFuseFees = totalFuseFees_;
    }

    function harnessExchangeRateDetails(uint _totalSupply, uint _totalBorrows, uint _totalReserves, uint _totalAdminFees, uint _totalFuseFees) public {
        totalSupply = _totalSupply;
        totalBorrows = _totalBorrows;
        totalReserves = _totalReserves;
        totalAdminFees = _totalAdminFees;
        totalFuseFees = _totalFuseFees;
    }

    function harnessSetExchangeRate(uint exchangeRate) public {
        harnessExchangeRate = exchangeRate;
        harnessExchangeRateStored = true;
    }

    function harnessSetFailTransferToAddress(address _to, bool _fail) public {
        failTransferToAddresses[_to] = _fail;
    }

    function harnessMintFresh(address account, uint mintAmount) public returns (uint) {
        (uint err,) = super.mintFresh(account, mintAmount);
        return err;
    }

    function harnessRedeemFresh(address payable account, uint cTokenAmount, uint underlyingAmount) public returns (uint) {
        return super.redeemFresh(account, cTokenAmount, underlyingAmount);
    }

    function harnessAccountBorrows(address account) public view returns (uint principal, uint interestIndex) {
        BorrowSnapshot memory snapshot = accountBorrows[account];
        return (snapshot.principal, snapshot.interestIndex);
    }

    function harnessSetAccountBorrows(address account, uint principal, uint interestIndex) public {
        accountBorrows[account] = BorrowSnapshot({principal: principal, interestIndex: interestIndex});
    }

    function harnessSetBorrowIndex(uint borrowIndex_) public {
        borrowIndex = borrowIndex_;
    }

    function harnessBorrowFresh(address payable account, uint borrowAmount) public returns (uint) {
        return borrowFresh(account, borrowAmount);
    }

    function harnessRepayBorrowFresh(address payer, address account, uint repayAmount) public payable returns (uint) {
        (uint err,) = repayBorrowFresh(payer, account, repayAmount);
        return err;
    }

    function harnessLiquidateBorrowFresh(address liquidator, address borrower, uint repayAmount, CToken cTokenCollateral) public returns (uint) {
        (uint err,) = liquidateBorrowFresh(liquidator, borrower, repayAmount, cTokenCollateral);
        return err;
    }

    function harnessReduceReservesFresh(uint amount) public returns (uint) {
        return _reduceReservesFresh(amount);
    }

    function harnessSetReserveFactorFresh(uint newReserveFactorMantissa) public returns (uint) {
        return _setReserveFactorFresh(newReserveFactorMantissa);
    }

    function harnessWithdrawFuseFeesFresh(uint amount) public returns (uint) {
        return _withdrawFuseFeesFresh(amount);
    }

    function harnessSetFuseFeeFresh(uint newFuseFeeMantissa) public returns (uint) {
        return _setFuseFeeFresh(newFuseFeeMantissa);
    }

    function harnessWithdrawAdminFeesFresh(uint amount) public returns (uint) {
        return _withdrawAdminFeesFresh(amount);
    }

    function harnessSetAdminFeeFresh(uint newAdminFeeMantissa) public returns (uint) {
        return _setAdminFeeFresh(newAdminFeeMantissa);
    }

    function harnessSetInterestRateModelFresh(InterestRateModel newInterestRateModel) public returns (uint) {
        return _setInterestRateModelFresh(newInterestRateModel);
    }

    function harnessSetInterestRateModel(address newInterestRateModelAddress) public {
        interestRateModel = InterestRateModel(newInterestRateModelAddress);
    }

    function harnessGetCashPrior() public payable returns (uint) {
        return getCashPrior();
    }

    function harnessDoTransferIn(address from, uint amount) public payable returns (uint) {
        return doTransferIn(from, amount);
    }

    function harnessDoTransferOut(address payable to, uint amount) public payable {
        return doTransferOut(to, amount);
    }

    uint internal pendingFuseFeeMantissa = 0;

    function getPendingFuseFeeFromAdmin() internal view returns (uint) {
        return pendingFuseFeeMantissa;
    }

    function setPendingFuseFee(uint newPendingFuseFeeMantissa) external {
        pendingFuseFeeMantissa = newPendingFuseFeeMantissa;
    }
}
