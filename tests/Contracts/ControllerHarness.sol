pragma solidity ^0.5.16;

import "../../contracts/Controller.sol";
import "../../contracts/PriceOracle.sol";

contract ControllerKovan is Controller {
  function getVtxAddress() public view returns (address) {
    return 0x61460874a7196d6a22D1eE4922473664b3E95270;
  }
}

contract ControllerRopsten is Controller {
  function getVtxAddress() public view returns (address) {
    return 0x1Fe16De955718CFAb7A44605458AB023838C2793;
  }
}

contract ControllerHarness is Controller {
    address vtxAddress;
    uint public blockNumber;

    constructor() Controller() public {}

    function setPauseGuardian(address harnessedPauseGuardian) public {
        pauseGuardian = harnessedPauseGuardian;
    }

    function setVtxSupplyState(address vToken, uint224 index, uint32 blockNumber_) public {
        vtxSupplyState[vToken].index = index;
        vtxSupplyState[vToken].block = blockNumber_;
    }

    function setVtxBorrowState(address vToken, uint224 index, uint32 blockNumber_) public {
        vtxBorrowState[vToken].index = index;
        vtxBorrowState[vToken].block = blockNumber_;
    }

    function setVtxAccrued(address user, uint userAccrued) public {
        vtxAccrued[user] = userAccrued;
    }

    function setVtxAddress(address vtxAddress_) public {
        vtxAddress = vtxAddress_;
    }

    function getVtxAddress() public view returns (address) {
        return vtxAddress;
    }

    /**
     * @notice Set the amount of VTX distributed per block
     * @param vtxRate_ The amount of VTX wei per block to distribute
     */
    function harnessSetVtxRate(uint vtxRate_) public {
        vtxRate = vtxRate_;
    }

    /**
     * @notice Recalculate and update VTX speeds for all VTX markets
     */
    function harnessRefreshVtxSpeeds() public {
        VToken[] memory allMarkets_ = allMarkets;

        for (uint i = 0; i < allMarkets_.length; i++) {
            VToken vToken = allMarkets_[i];
            Exp memory borrowIndex = Exp({mantissa: vToken.borrowIndex()});
            updateVtxSupplyIndex(address(vToken));
            updateVtxBorrowIndex(address(vToken), borrowIndex);
        }

        Exp memory totalUtility = Exp({mantissa: 0});
        Exp[] memory utilities = new Exp[](allMarkets_.length);
        for (uint i = 0; i < allMarkets_.length; i++) {
            VToken vToken = allMarkets_[i];
            if (vtxSpeeds[address(vToken)] > 0) {
                Exp memory assetPrice = Exp({mantissa: oracle.getUnderlyingPrice(vToken)});
                Exp memory utility = mul_(assetPrice, vToken.totalBorrows());
                utilities[i] = utility;
                totalUtility = add_(totalUtility, utility);
            }
        }

        for (uint i = 0; i < allMarkets_.length; i++) {
            VToken vToken = allMarkets[i];
            uint newSpeed = totalUtility.mantissa > 0 ? mul_(vtxRate, div_(utilities[i], totalUtility)) : 0;
            setVtxSpeedInternal(vToken, newSpeed);
        }
    }

    function setVtxBorrowerIndex(address vToken, address borrower, uint index) public {
        vtxBorrowerIndex[vToken][borrower] = index;
    }

    function setVtxSupplierIndex(address vToken, address supplier, uint index) public {
        vtxSupplierIndex[vToken][supplier] = index;
    }

    function harnessDistributeAllBorrowerVtx(address vToken, address borrower, uint marketBorrowIndexMantissa) public {
        distributeBorrowerVtx(vToken, borrower, Exp({mantissa: marketBorrowIndexMantissa}));
        vtxAccrued[borrower] = grantVtxInternal(borrower, vtxAccrued[borrower]);
    }

    function harnessDistributeAllSupplierVtx(address vToken, address supplier) public {
        distributeSupplierVtx(vToken, supplier);
        vtxAccrued[supplier] = grantVtxInternal(supplier, vtxAccrued[supplier]);
    }

    function harnessUpdateVtxBorrowIndex(address vToken, uint marketBorrowIndexMantissa) public {
        updateVtxBorrowIndex(vToken, Exp({mantissa: marketBorrowIndexMantissa}));
    }

    function harnessUpdateVtxSupplyIndex(address vToken) public {
        updateVtxSupplyIndex(vToken);
    }

    function harnessDistributeBorrowerVtx(address vToken, address borrower, uint marketBorrowIndexMantissa) public {
        distributeBorrowerVtx(vToken, borrower, Exp({mantissa: marketBorrowIndexMantissa}));
    }

    function harnessDistributeSupplierVtx(address vToken, address supplier) public {
        distributeSupplierVtx(vToken, supplier);
    }

    function harnessTransferVtx(address user, uint userAccrued, uint threshold) public returns (uint) {
        if (userAccrued > 0 && userAccrued >= threshold) {
            return grantVtxInternal(user, userAccrued);
        }
        return userAccrued;
    }

    function harnessAddVtxMarkets(address[] memory vTokens) public {
        for (uint i = 0; i < vTokens.length; i++) {
            // temporarily set vtxSpeed to 1 (will be fixed by `harnessRefreshVtxSpeeds`)
            setVtxSpeedInternal(VToken(vTokens[i]), 1);
        }
    }

    function harnessFastForward(uint blocks) public returns (uint) {
        blockNumber += blocks;
        return blockNumber;
    }

    function setBlockNumber(uint number) public {
        blockNumber = number;
    }

    function getBlockNumber() public view returns (uint) {
        return blockNumber;
    }

    function getVtxMarkets() public view returns (address[] memory) {
        uint m = allMarkets.length;
        uint n = 0;
        for (uint i = 0; i < m; i++) {
            if (vtxSpeeds[address(allMarkets[i])] > 0) {
                n++;
            }
        }

        address[] memory vtxMarkets = new address[](n);
        uint k = 0;
        for (uint i = 0; i < m; i++) {
            if (vtxSpeeds[address(allMarkets[i])] > 0) {
                vtxMarkets[k++] = address(allMarkets[i]);
            }
        }
        return vtxMarkets;
    }
}

contract ControllerBorked {
    function _become(Unitroller unitroller, PriceOracle _oracle, uint _closeFactorMantissa, uint _maxAssets, bool _reinitializing) public {
        _oracle;
        _closeFactorMantissa;
        _maxAssets;
        _reinitializing;

        require(msg.sender == unitroller.admin(), "only unitroller admin can change brains");
        unitroller._acceptImplementation();
    }
}

contract BoolController is ControllerInterface {
    bool allowMint = true;
    bool allowRedeem = true;
    bool allowBorrow = true;
    bool allowRepayBorrow = true;
    bool allowLiquidateBorrow = true;
    bool allowSeize = true;
    bool allowTransfer = true;

    bool verifyMint = true;
    bool verifyRedeem = true;
    bool verifyBorrow = true;
    bool verifyRepayBorrow = true;
    bool verifyLiquidateBorrow = true;
    bool verifySeize = true;
    bool verifyTransfer = true;

    bool failCalculateSeizeTokens;
    uint calculatedSeizeTokens;

    uint noError = 0;
    uint opaqueError = noError + 11; // an arbitrary, opaque error code

    /*** Assets You Are In ***/

    function enterMarkets(address[] calldata _vTokens) external returns (uint[] memory) {
        _vTokens;
        uint[] memory ret;
        return ret;
    }

    function exitMarket(address _vToken) external returns (uint) {
        _vToken;
        return noError;
    }

    /*** Policy Hooks ***/

    function mintAllowed(address _vToken, address _minter, uint _mintAmount) public returns (uint) {
        _vToken;
        _minter;
        _mintAmount;
        return allowMint ? noError : opaqueError;
    }

    function mintVerify(address _vToken, address _minter, uint _mintAmount, uint _mintTokens) external {
        _vToken;
        _minter;
        _mintAmount;
        _mintTokens;
        require(verifyMint, "mintVerify rejected mint");
    }

    function redeemAllowed(address _vToken, address _redeemer, uint _redeemTokens) public returns (uint) {
        _vToken;
        _redeemer;
        _redeemTokens;
        return allowRedeem ? noError : opaqueError;
    }

    function redeemVerify(address _vToken, address _redeemer, uint _redeemAmount, uint _redeemTokens) external {
        _vToken;
        _redeemer;
        _redeemAmount;
        _redeemTokens;
        require(verifyRedeem, "redeemVerify rejected redeem");
    }

    function borrowAllowed(address _vToken, address _borrower, uint _borrowAmount) public returns (uint) {
        _vToken;
        _borrower;
        _borrowAmount;
        return allowBorrow ? noError : opaqueError;
    }

    function borrowVerify(address _vToken, address _borrower, uint _borrowAmount) external {
        _vToken;
        _borrower;
        _borrowAmount;
        require(verifyBorrow, "borrowVerify rejected borrow");
    }

    function repayBorrowAllowed(
        address _vToken,
        address _payer,
        address _borrower,
        uint _repayAmount) public returns (uint) {
        _vToken;
        _payer;
        _borrower;
        _repayAmount;
        return allowRepayBorrow ? noError : opaqueError;
    }

    function repayBorrowVerify(
        address _vToken,
        address _payer,
        address _borrower,
        uint _repayAmount,
        uint _borrowerIndex) external {
        _vToken;
        _payer;
        _borrower;
        _repayAmount;
        _borrowerIndex;
        require(verifyRepayBorrow, "repayBorrowVerify rejected repayBorrow");
    }

    function liquidateBorrowAllowed(
        address _vTokenBorrowed,
        address _vTokenCollateral,
        address _liquidator,
        address _borrower,
        uint _repayAmount) public returns (uint) {
        _vTokenBorrowed;
        _vTokenCollateral;
        _liquidator;
        _borrower;
        _repayAmount;
        return allowLiquidateBorrow ? noError : opaqueError;
    }

    function liquidateBorrowVerify(
        address _vTokenBorrowed,
        address _vTokenCollateral,
        address _liquidator,
        address _borrower,
        uint _repayAmount,
        uint _seizeTokens) external {
        _vTokenBorrowed;
        _vTokenCollateral;
        _liquidator;
        _borrower;
        _repayAmount;
        _seizeTokens;
        require(verifyLiquidateBorrow, "liquidateBorrowVerify rejected liquidateBorrow");
    }

    function seizeAllowed(
        address _vTokenCollateral,
        address _vTokenBorrowed,
        address _borrower,
        address _liquidator,
        uint _seizeTokens) public returns (uint) {
        _vTokenCollateral;
        _vTokenBorrowed;
        _liquidator;
        _borrower;
        _seizeTokens;
        return allowSeize ? noError : opaqueError;
    }

    function seizeVerify(
        address _vTokenCollateral,
        address _vTokenBorrowed,
        address _liquidator,
        address _borrower,
        uint _seizeTokens) external {
        _vTokenCollateral;
        _vTokenBorrowed;
        _liquidator;
        _borrower;
        _seizeTokens;
        require(verifySeize, "seizeVerify rejected seize");
    }

    function transferAllowed(
        address _vToken,
        address _src,
        address _dst,
        uint _transferTokens) public returns (uint) {
        _vToken;
        _src;
        _dst;
        _transferTokens;
        return allowTransfer ? noError : opaqueError;
    }

    function transferVerify(
        address _vToken,
        address _src,
        address _dst,
        uint _transferTokens) external {
        _vToken;
        _src;
        _dst;
        _transferTokens;
        require(verifyTransfer, "transferVerify rejected transfer");
    }

    /*** Special Liquidation Calculation ***/

    function liquidateCalculateSeizeTokens(
        address _vTokenBorrowed,
        address _vTokenCollateral,
        uint _repayAmount) public view returns (uint, uint) {
        _vTokenBorrowed;
        _vTokenCollateral;
        _repayAmount;
        return failCalculateSeizeTokens ? (opaqueError, 0) : (noError, calculatedSeizeTokens);
    }

    /**** Mock Settors ****/

    /*** Policy Hooks ***/

    function setMintAllowed(bool allowMint_) public {
        allowMint = allowMint_;
    }

    function setMintVerify(bool verifyMint_) public {
        verifyMint = verifyMint_;
    }

    function setRedeemAllowed(bool allowRedeem_) public {
        allowRedeem = allowRedeem_;
    }

    function setRedeemVerify(bool verifyRedeem_) public {
        verifyRedeem = verifyRedeem_;
    }

    function setBorrowAllowed(bool allowBorrow_) public {
        allowBorrow = allowBorrow_;
    }

    function setBorrowVerify(bool verifyBorrow_) public {
        verifyBorrow = verifyBorrow_;
    }

    function setRepayBorrowAllowed(bool allowRepayBorrow_) public {
        allowRepayBorrow = allowRepayBorrow_;
    }

    function setRepayBorrowVerify(bool verifyRepayBorrow_) public {
        verifyRepayBorrow = verifyRepayBorrow_;
    }

    function setLiquidateBorrowAllowed(bool allowLiquidateBorrow_) public {
        allowLiquidateBorrow = allowLiquidateBorrow_;
    }

    function setLiquidateBorrowVerify(bool verifyLiquidateBorrow_) public {
        verifyLiquidateBorrow = verifyLiquidateBorrow_;
    }

    function setSeizeAllowed(bool allowSeize_) public {
        allowSeize = allowSeize_;
    }

    function setSeizeVerify(bool verifySeize_) public {
        verifySeize = verifySeize_;
    }

    function setTransferAllowed(bool allowTransfer_) public {
        allowTransfer = allowTransfer_;
    }

    function setTransferVerify(bool verifyTransfer_) public {
        verifyTransfer = verifyTransfer_;
    }

    /*** Liquidity/Liquidation Calculations ***/

    function setCalculatedSeizeTokens(uint seizeTokens_) public {
        calculatedSeizeTokens = seizeTokens_;
    }

    function setFailCalculateSeizeTokens(bool shouldFail) public {
        failCalculateSeizeTokens = shouldFail;
    }
}

contract EchoTypesController is UnitrollerAdminStorage {
    function stringy(string memory s) public pure returns(string memory) {
        return s;
    }

    function addresses(address a) public pure returns(address) {
        return a;
    }

    function booly(bool b) public pure returns(bool) {
        return b;
    }

    function listOInts(uint[] memory u) public pure returns(uint[] memory) {
        return u;
    }

    function reverty() public pure {
        require(false, "gotcha sucka");
    }

    function becomeBrains(address payable unitroller) public {
        Unitroller(unitroller)._acceptImplementation();
    }
}
