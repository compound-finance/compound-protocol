pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import "../VErc20.sol";
import "../VToken.sol";
import "../PriceOracle.sol";
import "../EIP20Interface.sol";
import "../Governance/GovernorAlpha.sol";
import "../Governance/Vtx.sol";

interface ControllerLensInterface {
    function markets(address) external view returns (bool, uint);
    function oracle() external view returns (PriceOracle);
    function getAccountLiquidity(address) external view returns (uint, uint, uint);
    function getAssetsIn(address) external view returns (VToken[] memory);
    function claimVtx(address) external;
    function vtxAccrued(address) external view returns (uint);
}

contract VortexLens {
    struct VTokenMetadata {
        address vToken;
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
        uint vTokenDecimals;
        uint underlyingDecimals;
    }

    function vTokenMetadata(VToken vToken) public returns (VTokenMetadata memory) {
        uint exchangeRateCurrent = vToken.exchangeRateCurrent();
        ControllerLensInterface controller = ControllerLensInterface(address(vToken.controller()));
        (bool isListed, uint collateralFactorMantissa) = controller.markets(address(vToken));
        address underlyingAssetAddress;
        uint underlyingDecimals;

        if (vtxareStrings(vToken.symbol(), "vETH")) {
            underlyingAssetAddress = address(0);
            underlyingDecimals = 18;
        } else {
            VErc20 vErc20 = VErc20(address(vToken));
            underlyingAssetAddress = vErc20.underlying();
            underlyingDecimals = EIP20Interface(vErc20.underlying()).decimals();
        }

        return VTokenMetadata({
            vToken: address(vToken),
            exchangeRateCurrent: exchangeRateCurrent,
            supplyRatePerBlock: vToken.supplyRatePerBlock(),
            borrowRatePerBlock: vToken.borrowRatePerBlock(),
            reserveFactorMantissa: vToken.reserveFactorMantissa(),
            totalBorrows: vToken.totalBorrows(),
            totalReserves: vToken.totalReserves(),
            totalSupply: vToken.totalSupply(),
            totalCash: vToken.getCash(),
            isListed: isListed,
            collateralFactorMantissa: collateralFactorMantissa,
            underlyingAssetAddress: underlyingAssetAddress,
            vTokenDecimals: vToken.decimals(),
            underlyingDecimals: underlyingDecimals
        });
    }

    function vTokenMetadataAll(VToken[] calldata vTokens) external returns (VTokenMetadata[] memory) {
        uint vTokenCount = vTokens.length;
        VTokenMetadata[] memory res = new VTokenMetadata[](vTokenCount);
        for (uint i = 0; i < vTokenCount; i++) {
            res[i] = vTokenMetadata(vTokens[i]);
        }
        return res;
    }

    struct VTokenBalances {
        address vToken;
        uint balanceOf;
        uint borrowBalanceCurrent;
        uint balanceOfUnderlying;
        uint tokenBalance;
        uint tokenAllowance;
    }

    function vTokenBalances(VToken vToken, address payable account) public returns (VTokenBalances memory) {
        uint balanceOf = vToken.balanceOf(account);
        uint borrowBalanceCurrent = vToken.borrowBalanceCurrent(account);
        uint balanceOfUnderlying = vToken.balanceOfUnderlying(account);
        uint tokenBalance;
        uint tokenAllowance;

        if (vtxareStrings(vToken.symbol(), "vETH")) {
            tokenBalance = account.balance;
            tokenAllowance = account.balance;
        } else {
            VErc20 vErc20 = VErc20(address(vToken));
            EIP20Interface underlying = EIP20Interface(vErc20.underlying());
            tokenBalance = underlying.balanceOf(account);
            tokenAllowance = underlying.allowance(account, address(vToken));
        }

        return VTokenBalances({
            vToken: address(vToken),
            balanceOf: balanceOf,
            borrowBalanceCurrent: borrowBalanceCurrent,
            balanceOfUnderlying: balanceOfUnderlying,
            tokenBalance: tokenBalance,
            tokenAllowance: tokenAllowance
        });
    }

    function vTokenBalancesAll(VToken[] calldata vTokens, address payable account) external returns (VTokenBalances[] memory) {
        uint vTokenCount = vTokens.length;
        VTokenBalances[] memory res = new VTokenBalances[](vTokenCount);
        for (uint i = 0; i < vTokenCount; i++) {
            res[i] = vTokenBalances(vTokens[i], account);
        }
        return res;
    }

    struct VTokenUnderlyingPrice {
        address vToken;
        uint underlyingPrice;
    }

    function vTokenUnderlyingPrice(VToken vToken) public returns (VTokenUnderlyingPrice memory) {
        ControllerLensInterface controller = ControllerLensInterface(address(vToken.controller()));
        PriceOracle priceOracle = controller.oracle();

        return VTokenUnderlyingPrice({
            vToken: address(vToken),
            underlyingPrice: priceOracle.getUnderlyingPrice(vToken)
        });
    }

    function vTokenUnderlyingPriceAll(VToken[] calldata vTokens) external returns (VTokenUnderlyingPrice[] memory) {
        uint vTokenCount = vTokens.length;
        VTokenUnderlyingPrice[] memory res = new VTokenUnderlyingPrice[](vTokenCount);
        for (uint i = 0; i < vTokenCount; i++) {
            res[i] = vTokenUnderlyingPrice(vTokens[i]);
        }
        return res;
    }

    struct AccountLimits {
        VToken[] markets;
        uint liquidity;
        uint shortfall;
    }

    function getAccountLimits(ControllerLensInterface controller, address account) public returns (AccountLimits memory) {
        (uint errorCode, uint liquidity, uint shortfall) = controller.getAccountLiquidity(account);
        require(errorCode == 0);

        return AccountLimits({
            markets: controller.getAssetsIn(account),
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

    struct VtxBalanceMetadata {
        uint balance;
        uint votes;
        address delegate;
    }

    function getVtxBalanceMetadata(Vtx vtx, address account) external view returns (VtxBalanceMetadata memory) {
        return VtxBalanceMetadata({
            balance: vtx.balanceOf(account),
            votes: uint256(vtx.getCurrentVotes(account)),
            delegate: vtx.delegates(account)
        });
    }

    struct VtxBalanceMetadataExt {
        uint balance;
        uint votes;
        address delegate;
        uint allocated;
    }

    function getVtxBalanceMetadataExt(Vtx vtx, ControllerLensInterface controller, address account) external returns (VtxBalanceMetadataExt memory) {
        uint balance = vtx.balanceOf(account);
        controller.claimVtx(account);
        uint newBalance = vtx.balanceOf(account);
        uint accrued = controller.vtxAccrued(account);
        uint total = add(accrued, newBalance, "sum vtx total");
        uint allocated = sub(total, balance, "sub allocated");

        return VtxBalanceMetadataExt({
            balance: balance,
            votes: uint256(vtx.getCurrentVotes(account)),
            delegate: vtx.delegates(account),
            allocated: allocated
        });
    }

    struct VtxVotes {
        uint blockNumber;
        uint votes;
    }

    function getVtxVotes(Vtx vtx, address account, uint32[] calldata blockNumbers) external view returns (VtxVotes[] memory) {
        VtxVotes[] memory res = new VtxVotes[](blockNumbers.length);
        for (uint i = 0; i < blockNumbers.length; i++) {
            res[i] = VtxVotes({
                blockNumber: uint256(blockNumbers[i]),
                votes: uint256(vtx.getPriorVotes(account, blockNumbers[i]))
            });
        }
        return res;
    }

    function vtxareStrings(string memory a, string memory b) internal pure returns (bool) {
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
