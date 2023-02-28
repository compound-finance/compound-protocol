// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

import "../XErc20.sol";
import "../XToken.sol";
import "../PriceOracle.sol";
import "../EIP20Interface.sol";
import "../Governance/GovernorAlpha.sol";
import "../Governance/Comp.sol";

interface ComptrollerLensInterface {
    function markets(address) external view returns (bool, uint);
    function oracle() external view returns (PriceOracle);
    function getAccountLiquidity(address) external view returns (uint, uint, uint);
    function getAssetsIn(address) external view returns (XToken[] memory);
    function claimComp(address) external;
    function compAccrued(address) external view returns (uint);
    function compSpeeds(address) external view returns (uint);
    function compSupplySpeeds(address) external view returns (uint);
    function compBorrowSpeeds(address) external view returns (uint);
    function borrowCaps(address) external view returns (uint);
}

interface GovernorBravoInterface {
    struct Receipt {
        bool hasVoted;
        uint8 support;
        uint96 votes;
    }
    struct Proposal {
        uint id;
        address proposer;
        uint eta;
        uint startBlock;
        uint endBlock;
        uint forVotes;
        uint againstVotes;
        uint abstainVotes;
        bool canceled;
        bool executed;
    }
    function getActions(uint proposalId) external view returns (address[] memory targets, uint[] memory values, string[] memory signatures, bytes[] memory calldatas);
    function proposals(uint proposalId) external view returns (Proposal memory);
    function getReceipt(uint proposalId, address voter) external view returns (Receipt memory);
}

contract CompoundLens {
    struct XTokenMetadata {
        address xToken;
        uint exchangeRateCurrent;
        uint supplyRatePerBlock;
        uint borrowRatePerBlock;
        uint reserveFactorMantissa;
        uint totalBorrows;
        uint totalReserves;
        uint totalSupply;
        uint totalCash;
        bool isListed;
        uint collateralFactorMantissa;
        address underlyingAssetAddress;
        uint xTokenDecimals;
        uint underlyingDecimals;
        uint compSupplySpeed;
        uint compBorrowSpeed;
        uint borrowCap;
    }

    function getCompSpeeds(ComptrollerLensInterface comptroller, XToken xToken) internal returns (uint, uint) {
        // Getting comp speeds is gnarly due to not every network having the
        // split comp speeds from Proposal 62 and other networks don't even
        // have comp speeds.
        uint compSupplySpeed = 0;
        (bool compSupplySpeedSuccess, bytes memory compSupplySpeedReturnData) =
            address(comptroller).call(
                abi.encodePacked(
                    comptroller.compSupplySpeeds.selector,
                    abi.encode(address(xToken))
                )
            );
        if (compSupplySpeedSuccess) {
            compSupplySpeed = abi.decode(compSupplySpeedReturnData, (uint));
        }

        uint compBorrowSpeed = 0;
        (bool compBorrowSpeedSuccess, bytes memory compBorrowSpeedReturnData) =
            address(comptroller).call(
                abi.encodePacked(
                    comptroller.compBorrowSpeeds.selector,
                    abi.encode(address(xToken))
                )
            );
        if (compBorrowSpeedSuccess) {
            compBorrowSpeed = abi.decode(compBorrowSpeedReturnData, (uint));
        }

        // If the split comp speeds call doesn't work, try the  oldest non-spit version.
        if (!compSupplySpeedSuccess || !compBorrowSpeedSuccess) {
            (bool compSpeedSuccess, bytes memory compSpeedReturnData) =
            address(comptroller).call(
                abi.encodePacked(
                    comptroller.compSpeeds.selector,
                    abi.encode(address(xToken))
                )
            );
            if (compSpeedSuccess) {
                compSupplySpeed = compBorrowSpeed = abi.decode(compSpeedReturnData, (uint));
            }
        }
        return (compSupplySpeed, compBorrowSpeed);
    }

    function xTokenMetadata(XToken xToken) public returns (XTokenMetadata memory) {
        uint exchangeRateCurrent = xToken.exchangeRateCurrent();
        ComptrollerLensInterface comptroller = ComptrollerLensInterface(address(xToken.comptroller()));
        (bool isListed, uint collateralFactorMantissa) = comptroller.markets(address(xToken));
        address underlyingAssetAddress;
        uint underlyingDecimals;

        if (compareStrings(xToken.symbol(), "cETH")) {
            underlyingAssetAddress = address(0);
            underlyingDecimals = 18;
        } else {
            XErc20 cErc20 = XErc20(address(xToken));
            underlyingAssetAddress = cErc20.underlying();
            underlyingDecimals = EIP20Interface(cErc20.underlying()).decimals();
        }

        (uint compSupplySpeed, uint compBorrowSpeed) = getCompSpeeds(comptroller, xToken);

        uint borrowCap = 0;
        (bool borrowCapSuccess, bytes memory borrowCapReturnData) =
            address(comptroller).call(
                abi.encodePacked(
                    comptroller.borrowCaps.selector,
                    abi.encode(address(xToken))
                )
            );
        if (borrowCapSuccess) {
            borrowCap = abi.decode(borrowCapReturnData, (uint));
        }

        return XTokenMetadata({
            xToken: address(xToken),
            exchangeRateCurrent: exchangeRateCurrent,
            supplyRatePerBlock: xToken.supplyRatePerBlock(),
            borrowRatePerBlock: xToken.borrowRatePerBlock(),
            reserveFactorMantissa: xToken.reserveFactorMantissa(),
            totalBorrows: xToken.totalBorrows(),
            totalReserves: xToken.totalReserves(),
            totalSupply: xToken.totalSupply(),
            totalCash: xToken.getCash(),
            isListed: isListed,
            collateralFactorMantissa: collateralFactorMantissa,
            underlyingAssetAddress: underlyingAssetAddress,
            xTokenDecimals: xToken.decimals(),
            underlyingDecimals: underlyingDecimals,
            compSupplySpeed: compSupplySpeed,
            compBorrowSpeed: compBorrowSpeed,
            borrowCap: borrowCap
        });
    }

    function xTokenMetadataAll(XToken[] calldata xTokens) external returns (XTokenMetadata[] memory) {
        uint xTokenCount = xTokens.length;
        XTokenMetadata[] memory res = new XTokenMetadata[](xTokenCount);
        for (uint i = 0; i < xTokenCount; i++) {
            res[i] = xTokenMetadata(xTokens[i]);
        }
        return res;
    }

    struct XTokenBalances {
        address xToken;
        uint balanceOf;
        uint borrowBalanceCurrent;
        uint balanceOfUnderlying;
        uint tokenBalance;
        uint tokenAllowance;
    }

    function xTokenBalances(XToken xToken, address payable account) public returns (XTokenBalances memory) {
        uint balanceOf = xToken.balanceOf(account);
        uint borrowBalanceCurrent = xToken.borrowBalanceCurrent(account);
        uint balanceOfUnderlying = xToken.balanceOfUnderlying(account);
        uint tokenBalance;
        uint tokenAllowance;

        if (compareStrings(xToken.symbol(), "cETH")) {
            tokenBalance = account.balance;
            tokenAllowance = account.balance;
        } else {
            XErc20 cErc20 = XErc20(address(xToken));
            EIP20Interface underlying = EIP20Interface(cErc20.underlying());
            tokenBalance = underlying.balanceOf(account);
            tokenAllowance = underlying.allowance(account, address(xToken));
        }

        return XTokenBalances({
            xToken: address(xToken),
            balanceOf: balanceOf,
            borrowBalanceCurrent: borrowBalanceCurrent,
            balanceOfUnderlying: balanceOfUnderlying,
            tokenBalance: tokenBalance,
            tokenAllowance: tokenAllowance
        });
    }

    function xTokenBalancesAll(XToken[] calldata xTokens, address payable account) external returns (XTokenBalances[] memory) {
        uint xTokenCount = xTokens.length;
        XTokenBalances[] memory res = new XTokenBalances[](xTokenCount);
        for (uint i = 0; i < xTokenCount; i++) {
            res[i] = xTokenBalances(xTokens[i], account);
        }
        return res;
    }

    struct XTokenUnderlyingPrice {
        address xToken;
        uint underlyingPrice;
    }

    function xTokenUnderlyingPrice(XToken xToken) public returns (XTokenUnderlyingPrice memory) {
        ComptrollerLensInterface comptroller = ComptrollerLensInterface(address(xToken.comptroller()));
        PriceOracle priceOracle = comptroller.oracle();

        return XTokenUnderlyingPrice({
            xToken: address(xToken),
            underlyingPrice: priceOracle.getUnderlyingPrice(xToken)
        });
    }

    function xTokenUnderlyingPriceAll(XToken[] calldata xTokens) external returns (XTokenUnderlyingPrice[] memory) {
        uint xTokenCount = xTokens.length;
        XTokenUnderlyingPrice[] memory res = new XTokenUnderlyingPrice[](xTokenCount);
        for (uint i = 0; i < xTokenCount; i++) {
            res[i] = xTokenUnderlyingPrice(xTokens[i]);
        }
        return res;
    }

    struct AccountLimits {
        XToken[] markets;
        uint liquidity;
        uint shortfall;
    }

    function getAccountLimits(ComptrollerLensInterface comptroller, address account) public returns (AccountLimits memory) {
        (uint errorCode, uint liquidity, uint shortfall) = comptroller.getAccountLiquidity(account);
        require(errorCode == 0);

        return AccountLimits({
            markets: comptroller.getAssetsIn(account),
            liquidity: liquidity,
            shortfall: shortfall
        });
    }

    struct GovReceipt {
        uint proposalId;
        bool hasVoted;
        bool support;
        uint96 votes;
    }

    function getGovReceipts(GovernorAlpha governor, address voter, uint[] memory proposalIds) public view returns (GovReceipt[] memory) {
        uint proposalCount = proposalIds.length;
        GovReceipt[] memory res = new GovReceipt[](proposalCount);
        for (uint i = 0; i < proposalCount; i++) {
            GovernorAlpha.Receipt memory receipt = governor.getReceipt(proposalIds[i], voter);
            res[i] = GovReceipt({
                proposalId: proposalIds[i],
                hasVoted: receipt.hasVoted,
                support: receipt.support,
                votes: receipt.votes
            });
        }
        return res;
    }

    struct GovBravoReceipt {
        uint proposalId;
        bool hasVoted;
        uint8 support;
        uint96 votes;
    }

    function getGovBravoReceipts(GovernorBravoInterface governor, address voter, uint[] memory proposalIds) public view returns (GovBravoReceipt[] memory) {
        uint proposalCount = proposalIds.length;
        GovBravoReceipt[] memory res = new GovBravoReceipt[](proposalCount);
        for (uint i = 0; i < proposalCount; i++) {
            GovernorBravoInterface.Receipt memory receipt = governor.getReceipt(proposalIds[i], voter);
            res[i] = GovBravoReceipt({
                proposalId: proposalIds[i],
                hasVoted: receipt.hasVoted,
                support: receipt.support,
                votes: receipt.votes
            });
        }
        return res;
    }

    struct GovProposal {
        uint proposalId;
        address proposer;
        uint eta;
        address[] targets;
        uint[] values;
        string[] signatures;
        bytes[] calldatas;
        uint startBlock;
        uint endBlock;
        uint forVotes;
        uint againstVotes;
        bool canceled;
        bool executed;
    }

    function setProposal(GovProposal memory res, GovernorAlpha governor, uint proposalId) internal view {
        (
            ,
            address proposer,
            uint eta,
            uint startBlock,
            uint endBlock,
            uint forVotes,
            uint againstVotes,
            bool canceled,
            bool executed
        ) = governor.proposals(proposalId);
        res.proposalId = proposalId;
        res.proposer = proposer;
        res.eta = eta;
        res.startBlock = startBlock;
        res.endBlock = endBlock;
        res.forVotes = forVotes;
        res.againstVotes = againstVotes;
        res.canceled = canceled;
        res.executed = executed;
    }

    function getGovProposals(GovernorAlpha governor, uint[] calldata proposalIds) external view returns (GovProposal[] memory) {
        GovProposal[] memory res = new GovProposal[](proposalIds.length);
        for (uint i = 0; i < proposalIds.length; i++) {
            (
                address[] memory targets,
                uint[] memory values,
                string[] memory signatures,
                bytes[] memory calldatas
            ) = governor.getActions(proposalIds[i]);
            res[i] = GovProposal({
                proposalId: 0,
                proposer: address(0),
                eta: 0,
                targets: targets,
                values: values,
                signatures: signatures,
                calldatas: calldatas,
                startBlock: 0,
                endBlock: 0,
                forVotes: 0,
                againstVotes: 0,
                canceled: false,
                executed: false
            });
            setProposal(res[i], governor, proposalIds[i]);
        }
        return res;
    }

    struct GovBravoProposal {
        uint proposalId;
        address proposer;
        uint eta;
        address[] targets;
        uint[] values;
        string[] signatures;
        bytes[] calldatas;
        uint startBlock;
        uint endBlock;
        uint forVotes;
        uint againstVotes;
        uint abstainVotes;
        bool canceled;
        bool executed;
    }

    function setBravoProposal(GovBravoProposal memory res, GovernorBravoInterface governor, uint proposalId) internal view {
        GovernorBravoInterface.Proposal memory p = governor.proposals(proposalId);

        res.proposalId = proposalId;
        res.proposer = p.proposer;
        res.eta = p.eta;
        res.startBlock = p.startBlock;
        res.endBlock = p.endBlock;
        res.forVotes = p.forVotes;
        res.againstVotes = p.againstVotes;
        res.abstainVotes = p.abstainVotes;
        res.canceled = p.canceled;
        res.executed = p.executed;
    }

    function getGovBravoProposals(GovernorBravoInterface governor, uint[] calldata proposalIds) external view returns (GovBravoProposal[] memory) {
        GovBravoProposal[] memory res = new GovBravoProposal[](proposalIds.length);
        for (uint i = 0; i < proposalIds.length; i++) {
            (
                address[] memory targets,
                uint[] memory values,
                string[] memory signatures,
                bytes[] memory calldatas
            ) = governor.getActions(proposalIds[i]);
            res[i] = GovBravoProposal({
                proposalId: 0,
                proposer: address(0),
                eta: 0,
                targets: targets,
                values: values,
                signatures: signatures,
                calldatas: calldatas,
                startBlock: 0,
                endBlock: 0,
                forVotes: 0,
                againstVotes: 0,
                abstainVotes: 0,
                canceled: false,
                executed: false
            });
            setBravoProposal(res[i], governor, proposalIds[i]);
        }
        return res;
    }

    struct CompBalanceMetadata {
        uint balance;
        uint votes;
        address delegate;
    }

    function getCompBalanceMetadata(Comp comp, address account) external view returns (CompBalanceMetadata memory) {
        return CompBalanceMetadata({
            balance: comp.balanceOf(account),
            votes: uint256(comp.getCurrentVotes(account)),
            delegate: comp.delegates(account)
        });
    }

    struct CompBalanceMetadataExt {
        uint balance;
        uint votes;
        address delegate;
        uint allocated;
    }

    function getCompBalanceMetadataExt(Comp comp, ComptrollerLensInterface comptroller, address account) external returns (CompBalanceMetadataExt memory) {
        uint balance = comp.balanceOf(account);
        comptroller.claimComp(account);
        uint newBalance = comp.balanceOf(account);
        uint accrued = comptroller.compAccrued(account);
        uint total = add(accrued, newBalance, "sum comp total");
        uint allocated = sub(total, balance, "sub allocated");

        return CompBalanceMetadataExt({
            balance: balance,
            votes: uint256(comp.getCurrentVotes(account)),
            delegate: comp.delegates(account),
            allocated: allocated
        });
    }

    struct CompVotes {
        uint blockNumber;
        uint votes;
    }

    function getCompVotes(Comp comp, address account, uint32[] calldata blockNumbers) external view returns (CompVotes[] memory) {
        CompVotes[] memory res = new CompVotes[](blockNumbers.length);
        for (uint i = 0; i < blockNumbers.length; i++) {
            res[i] = CompVotes({
                blockNumber: uint256(blockNumbers[i]),
                votes: uint256(comp.getPriorVotes(account, blockNumbers[i]))
            });
        }
        return res;
    }

    function compareStrings(string memory a, string memory b) internal pure returns (bool) {
        return (keccak256(abi.encodePacked((a))) == keccak256(abi.encodePacked((b))));
    }

    function add(uint a, uint b, string memory errorMessage) internal pure returns (uint) {
        uint c = a + b;
        require(c >= a, errorMessage);
        return c;
    }

    function sub(uint a, uint b, string memory errorMessage) internal pure returns (uint) {
        require(b <= a, errorMessage);
        uint c = a - b;
        return c;
    }
}
