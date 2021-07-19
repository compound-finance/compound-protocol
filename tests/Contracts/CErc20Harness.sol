pragma solidity ^0.5.16;

import "../../contracts/CErc20Delegator.sol";
import "../../contracts/CErc20Delegate.sol";
import "../../contracts/CDaiDelegate.sol";
import "./ComptrollerHarness.sol";

contract CErc20DelegatorScenario is CErc20Delegator {
    constructor(address underlying_,
                ComptrollerInterface comptroller_,
                InterestRateModel interestRateModel_,
                uint initialExchangeRateMantissa_,
                string memory name_,
                string memory symbol_,
                uint8 decimals_,
                address payable admin_,
                address implementation_,
                bytes memory becomeImplementationData)
    CErc20Delegator(
    underlying_,
    comptroller_,
    interestRateModel_,
    initialExchangeRateMantissa_,
    name_,
    symbol_,
    decimals_,
    implementation_,
    becomeImplementationData,
    0,
    0) public {}
}

contract CErc20DelegateHarness is CErc20Delegate {
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

    function harnessRepayBorrowFresh(address payer, address account, uint repayAmount) public returns (uint) {
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

    function harnessCallBorrowAllowed(uint amount) public returns (uint) {
        return comptroller.borrowAllowed(address(this), msg.sender, amount);
    }

    uint internal pendingFuseFeeMantissa = 0;

    function getPendingFuseFeeFromAdmin() internal view returns (uint) {
        return pendingFuseFeeMantissa;
    }

    function setPendingFuseFee(uint newPendingFuseFeeMantissa) external {
        pendingFuseFeeMantissa = newPendingFuseFeeMantissa;
    }
}

contract CErc20DelegateScenario is CErc20Delegate {
    constructor() public {}

    function setTotalBorrows(uint totalBorrows_) public {
        totalBorrows = totalBorrows_;
    }

    function setTotalReserves(uint totalReserves_) public {
        totalReserves = totalReserves_;
    }

    function getBlockNumber() internal view returns (uint) {
        ComptrollerScenario comptrollerScenario = ComptrollerScenario(address(comptroller));
        return comptrollerScenario.blockNumber();
    }

    uint internal pendingFuseFeeMantissa = 0;

    function getPendingFuseFeeFromAdmin() internal view returns (uint) {
        return pendingFuseFeeMantissa;
    }

    function setPendingFuseFee(uint newPendingFuseFeeMantissa) external {
        pendingFuseFeeMantissa = newPendingFuseFeeMantissa;
    }
}

contract CDaiDelegateHarness is CDaiDelegate {
    uint blockNumber = 100000;
    uint harnessExchangeRate;
    bool harnessExchangeRateStored;

    function harnessFastForward(uint blocks) public {
        blockNumber += blocks;
    }

    function harnessSetAccrualBlockNumber(uint _accrualblockNumber) public {
        accrualBlockNumber = _accrualblockNumber;
    }

    function harnessSetBalance(address account, uint amount) external {
        accountTokens[account] = amount;
    }

    function harnessSetBlockNumber(uint newBlockNumber) public {
        blockNumber = newBlockNumber;
    }

    function harnessSetExchangeRate(uint exchangeRate) public {
        harnessExchangeRate = exchangeRate;
        harnessExchangeRateStored = true;
    }

    function harnessSetTotalSupply(uint totalSupply_) public {
        totalSupply = totalSupply_;
    }

    function getBlockNumber() internal view returns (uint) {
        return blockNumber;
    }

    uint internal pendingFuseFeeMantissa = 0;

    function getPendingFuseFeeFromAdmin() internal view returns (uint) {
        return pendingFuseFeeMantissa;
    }

    function setPendingFuseFee(uint newPendingFuseFeeMantissa) external {
        pendingFuseFeeMantissa = newPendingFuseFeeMantissa;
    }
}

contract CDaiDelegateScenario is CDaiDelegate {
    function setTotalBorrows(uint totalBorrows_) public {
        totalBorrows = totalBorrows_;
    }

    function setTotalReserves(uint totalReserves_) public {
        totalReserves = totalReserves_;
    }

    function getBlockNumber() internal view returns (uint) {
        ComptrollerScenario comptrollerScenario = ComptrollerScenario(address(comptroller));
        return comptrollerScenario.blockNumber();
    }

    uint internal pendingFuseFeeMantissa = 0;

    function getPendingFuseFeeFromAdmin() internal view returns (uint) {
        return pendingFuseFeeMantissa;
    }

    function setPendingFuseFee(uint newPendingFuseFeeMantissa) external {
        pendingFuseFeeMantissa = newPendingFuseFeeMantissa;
    }
}

contract CDaiDelegateMakerHarness is PotLike, VatLike, GemLike, DaiJoinLike {
    /* Pot */

    // exchangeRate
    function chi() external view returns (uint) { return 1; }

    // totalSupply
    function pie(address) external view returns (uint) { return 0; }

    // accrueInterest -> new exchangeRate
    function drip() external returns (uint) { return 0; }

    // mint
    function join(uint) external {}

    // redeem
    function exit(uint) external {}

    /* Vat */

    // internal dai balance
    function dai(address) external view returns (uint) { return 0; }

    // approve pot transfer
    function hope(address) external {}

    /* Gem (Dai) */

    uint public totalSupply;
    mapping (address => mapping (address => uint)) public allowance;
    mapping (address => uint) public balanceOf;
    function approve(address, uint) external {}
    function transferFrom(address src, address dst, uint amount) external returns (bool) {
        balanceOf[src] -= amount;
        balanceOf[dst] += amount;
        return true;
    }

    function harnessSetBalance(address account, uint amount) external {
        balanceOf[account] = amount;
    }

    /* DaiJoin */

    // vat contract
    function vat() external returns (VatLike) { return this; }

    // dai contract
    function dai() external returns (GemLike) { return this; }

    // dai -> internal dai
    function join(address, uint) external payable {}

    // internal dai transfer out
    function exit(address, uint) external {}
}
