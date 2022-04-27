Understanding of code base.

## CToken, CErc20 and CEther
The Compound cTokens, which are self-contained borrowing and lending contracts. CToken contains the core logic and CErc20 and CEther add public interfaces for Erc20 tokens and ether, respectively. Each CToken is assigned an interest rate and risk model (see InterestRateModel and Comptroller sections), and allows accounts to *mint* (supply capital), *redeem* (withdraw capital), *borrow* and *repay a borrow*. Each CToken is an ERC-20 compliant token where balances represent ownership of the market.

There are currently two types of cTokens (both types expose the EIP-20 interface): 

1. CErc20 wraps an underlying ERC-20 asset
2. CEther simply wraps Ether itself. 

Dependencies:

- [Comptroller Interface](./ComptrollerInterface.sol)
- [CToken Interfaces](./CTokenInterface.sol)
- [Error Reporter](./ErrorReporter.sol)
- [Exponential](./Exponential.sol)
- [EIP20 Interface](./EIP20Interface.sol)
- [Interest Rate Model](./InterestRateModel.sol)

Functions and associated steps:

- [initialize](./CToken.sol#L25): Initialize the money market, 
    1. Check only admin and only done once (accrualBlockNumber == 0 && borrowIndex == 0)
    2. Set initial exchange rate
    3. Set the comptroller
    4. Set block number (depends on comptroller) and borrow index
    5. Set the interest rate model (depends on block number / borrow index)
    6. Check for re-entrency with a flag set to true

- [transferTokens](./CToken.sol#L67): Transfer `tokens` from `src` to `dst` by `spender`, 
    1. Check that `src` has enough tokens to transfer, via comptroller
    2. No self transfer
    3. Get allowance
    4. Safe set src and dst balances
    5. emit a Transfer event

- [approve](./CToken.sol#L158): Approve `spender` to transfer up to `amount` from `src`,
    1. overwrite the approval amount for `spender`
    2. To prevent attack vectors, make sure to create user interfaces in such a way that they set the allowance first to 0 before setting it to another value for the same spender

- [balanceOfUnderlying](./CToken.sol#L190): user's underlying balance, representing their assets in the protocol, is equal to the user's cToken balance multiplied by the Exchange Rate,
    1. balance = exchangeRate * accountTokens[owner

- [getAccountSnapshot](./CToken.sol#L203): Get a snapshot of the account's balances, and the cached exchange rate, used by comptroller to more efficiently perform liquidity checks,
    1. Gets token balance, borrow balance, exchange rate

- [borrowRatePerBlock, supplyRatePerBlock](./CToken.sol#L282): Gets current per-block borrow interest rate and supply interest rate for the cToken from [interestRateModel](./InterestRateModel.sol)

- [borrowRatePerBlock, supplyRatePerBlock](./CToken.sol#L235): Gets current per-block borrow interest rate and supply interest rate for the cToken from [interestRateModel](./InterestRateModel.sol)

- [totalBorrowsCurrent, borrowBalanceCurrent, borrowBalanceStored](./CToken.sol#L243): 
    1. current total borrows plus accrued interest
    2. 

- [borrowBalanceStoredInternal](./CToken.sol#L235): Gets current per-block borrow interest rate and supply interest rate for the cToken from [interestRateModel](./InterestRateModel.sol)

## Comptroller
The risk model contract, which validates permissible user actions and disallows actions if they do not fit certain risk parameters. For instance, the Comptroller enforces that each borrowing user must maintain a sufficient collateral balance across all cTokens.

## Open Oracle
The [Open Oracle](https://github.com/nabaruns/open-oracle/tree/master/contracts) is a standard and SDK allowing reporters to sign key-value pairs (e.g. a price feed) that interested users can post to the blockchain. The system has a built-in view system that allows clients to easily share data and build aggregates (e.g. the median price from several sources).

## Comp
The Compound Governance Token (COMP). Holders of this token have the ability to govern the protocol via the governor contract.

## Governor Alpha
The administrator of the Compound timelock contract. Holders of Comp token may create and vote on proposals which will be queued into the Compound timelock and then have effects on Compound cToken and Comptroller contracts. This contract may be replaced in the future with a beta version.

## InterestRateModel
Contracts which define interest rate models. These models algorithmically determine interest rates based on the current utilization of a given market (that is, how much of the supplied assets are liquid versus borrowed).

## Careful Math
Library for safe math operations.

## ErrorReporter
Library for tracking error codes and failure conditions.

## Exponential
Library for handling fixed-point decimal numbers.

## SafeToken
Library for safely handling Erc20 interaction.

## WhitePaperInterestRateModel
Initial interest rate model, as defined in the Whitepaper. This contract accepts a base rate and slope parameter in its constructor.