pragma solidity ^0.5.12;

import "../CEther.sol";

contract CEtherHarness is CEther {

    uint harnessExchangeRate;
    uint public blockNumber = 100000;

    /*
    To support testing, we allow the contract to always fail `transfer`.
    */
    mapping (address => bool) public failTransferToAddresses;

    constructor(ComptrollerInterface comptroller_,
                InterestRateModel interestRateModel_,
                uint initialExchangeRateMantissa,
                string memory name_,
                string memory symbol_,
                uint8 decimals_,
                address payable admin_)
    CEther(
    comptroller_,
    interestRateModel_,
    initialExchangeRateMantissa,
    name_,
    symbol_,
    decimals_,
    admin_) public {}

    /**
      * Fresh
      *
      */
    function getBlockNumber() internal view returns (uint) {
        return blockNumber;
    }

    function harnessSetBlockNumber(uint newBlockNumber) public {
        blockNumber = newBlockNumber;
    }

    function harnessFastForward(uint blocks) public {
        blockNumber += blocks;
    }

    /**
      * Account Balances
      *
      */
    function harnessSetBalance(address account, uint amount) external {
        accountTokens[account] = amount;
    }

    /**
      * Accrual Block Number
      */
    function harnessSetAccrualBlockNumber(uint _accrualblockNumber) public {
        accrualBlockNumber = _accrualblockNumber;
    }

    /**
      * Exchange Rate
      *
      */
    function harnessSetTotalSupply(uint totalSupply_) public {
        totalSupply = totalSupply_;
    }

    function harnessSetTotalBorrows(uint totalBorrows_) public {
        totalBorrows = totalBorrows_;
    }

    function harnessSetTotalReserves(uint totalReserves_) public {
        totalReserves = totalReserves_;
    }

    function harnessExchangeRateDetails(uint _totalSupply, uint _totalBorrows, uint _totalReserves) public {
        totalSupply = _totalSupply;
        totalBorrows = _totalBorrows;
        totalReserves = _totalReserves;
    }

    function harnessSetExchangeRate(uint exchangeRate) public {
        harnessExchangeRate = exchangeRate;
    }

    function exchangeRateStoredInternal() internal view returns (MathError, uint) {
        if (harnessExchangeRate != 0) {
            return (MathError.NO_ERROR, harnessExchangeRate);
        }

        return super.exchangeRateStoredInternal();
    }

    /**
      * Transfer Harness methods
      *
      */

    /**
      * @dev Specify `address, true` to cause transfers to address to fail.
      *      Once an address has been marked for failure it can be cleared by
      *      with `address, false`
      */
    function harnessSetFailTransferToAddress(address _to, bool _fail) public {
        failTransferToAddresses[_to] = _fail;
    }

    function doTransferOut(address payable to, uint amount) internal {
        require(failTransferToAddresses[to] == false, "TOKEN_TRANSFER_OUT_FAILED");
        return super.doTransferOut(to, amount);
    }

    /**
     * Spearmint? Nah, fresh mint.
     *
     */
    function harnessMintFresh(address account, uint mintAmount) public returns (uint) {
        (uint err,) = super.mintFresh(account, mintAmount);
        return err;
    }

    /**
     * Redemption
     *
     */
    function harnessRedeemFresh(address payable account, uint cTokenAmount, uint underlyingAmount) public returns (uint) {
        return super.redeemFresh(account, cTokenAmount, underlyingAmount);
    }

    /**
      * Borrowing
      *
      */
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

    function harnessRepayBorrowFresh(address payer, address account, uint repayBorrowAmount) public payable returns (uint) {
        (uint err,) = repayBorrowFresh(payer, account, repayBorrowAmount);
        return err;
    }

    function harnessLiquidateBorrowFresh(address liquidator, address borrower, uint repayAmount, CToken cTokenCollateral) public returns (uint) {
        (uint err,) = liquidateBorrowFresh(liquidator, borrower, repayAmount, cTokenCollateral);
        return err;
    }
    /**
      * Admin
      *
      */
    function harnessReduceReservesFresh(uint amount) public returns (uint) {
        return _reduceReservesFresh(amount);
    }

    function harnessSetReserves(uint amount) public {
        totalReserves = amount;
    }

    function harnessSetReserveFactorFresh(uint newReserveFactorMantissa) public returns (uint) {
        return _setReserveFactorFresh(newReserveFactorMantissa);
    }

    function harnessSetInterestRateModelFresh(InterestRateModel newInterestRateModel) public returns (uint) {
        return _setInterestRateModelFresh(newInterestRateModel);
    }

    /**
      * @dev set the interest rate model directly, with no interest accrual and no checks
      * Intended for linking in FailableInterestRateModel to create failures in accrueInterest
      */
    function harnessSetInterestRateModel(address newInterestRateModelAddress) public {
        interestRateModel = InterestRateModel(newInterestRateModelAddress);
    }

    /** safe token harnes **/
    function harnessGetCashPrior() public payable returns (uint) {
        return getCashPrior();
    }

    function harnessDoTransferIn(address from, uint amount) public payable returns (uint) {
        return doTransferIn(from, amount);
    }

    function harnessDoTransferOut(address payable to, uint amount) public payable {
        return doTransferOut(to, amount);
    }

    function harnessCheckTransferIn(address from, uint amount) external payable returns (uint) {
        return uint(checkTransferIn(from, amount));
    }

    function harnessRequireNoError(uint error, string calldata message) external pure {
        requireNoError(error, message);
    }
}
