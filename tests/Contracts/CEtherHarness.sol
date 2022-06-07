// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

import "../../contracts/CEther.sol";
import "./ComptrollerScenario.sol";

contract CEtherHarness is CEther {
    uint harnessExchangeRate;
    uint public blockNumber = 100000;

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
    admin_) {}

    function doTransferOut(address payable to, uint amount) override internal {
        require(failTransferToAddresses[to] == false, "TOKEN_TRANSFER_OUT_FAILED");
        return super.doTransferOut(to, amount);
    }

    function exchangeRateStoredInternal() override internal view returns (uint) {
        if (harnessExchangeRate != 0) {
            return harnessExchangeRate;
        }
        return super.exchangeRateStoredInternal();
    }

    function getBlockNumber() override internal view returns (uint) {
        return blockNumber;
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

    function harnessExchangeRateDetails(uint _totalSupply, uint _totalBorrows, uint _totalReserves) public {
        totalSupply = _totalSupply;
        totalBorrows = _totalBorrows;
        totalReserves = _totalReserves;
    }

    function harnessSetExchangeRate(uint exchangeRate) public {
        harnessExchangeRate = exchangeRate;
    }

    function harnessSetFailTransferToAddress(address _to, bool _fail) public {
        failTransferToAddresses[_to] = _fail;
    }

    function harnessMintFresh(address account, uint mintAmount) public returns (uint) {
        super.mintFresh(account, mintAmount);
        return NO_ERROR;
    }

    function harnessRedeemFresh(address payable account, uint cTokenAmount, uint underlyingAmount) public returns (uint) {
        super.redeemFresh(account, cTokenAmount, underlyingAmount);
        return NO_ERROR;
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
        borrowFresh(account, borrowAmount);
        return NO_ERROR;
    }

    function harnessRepayBorrowFresh(address payer, address account, uint repayBorrowAmount) public payable returns (uint) {
        repayBorrowFresh(payer, account, repayBorrowAmount);
        return NO_ERROR;
    }

    function harnessLiquidateBorrowFresh(address liquidator, address borrower, uint repayAmount, CToken cTokenCollateral) public returns (uint) {
        liquidateBorrowFresh(liquidator, borrower, repayAmount, cTokenCollateral);
        return NO_ERROR;
    }

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
}

contract CEtherScenario is CEther {
    uint reserveFactor;

    constructor(string memory name_,
                string memory symbol_,
                uint8 decimals_,
                address payable admin_,
                ComptrollerInterface comptroller_,
                InterestRateModel interestRateModel_,
                uint initialExchangeRateMantissa)
        CEther(comptroller_,
               interestRateModel_,
               initialExchangeRateMantissa,
               name_,
               symbol_,
               decimals_,
               admin_) {
    }

    function setTotalBorrows(uint totalBorrows_) public {
        totalBorrows = totalBorrows_;
    }

    function setTotalReserves(uint totalReserves_) public {
        totalReserves = totalReserves_;
    }

    function donate() public payable {
        // no-op
    }

    function getBlockNumber() override internal view returns (uint) {
        ComptrollerScenario comptrollerScenario = ComptrollerScenario(address(comptroller));
        return comptrollerScenario.blockNumber();
    }
}
