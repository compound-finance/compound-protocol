Citrus Finance
=================

Citrus finance is blockchain agnositic fork of [Compound Finance](https://compound.finance/)

Changes
=======

- Added a fee taker on CToken for future profit sharing schema
- PriceOracleProxy is a fork of [Cream Oracle](https://github.com/CreamFi/compound-protocol/blob/90da68ceaff949d1c8dd155e8729fc7cb4fb9ddb/contracts/PriceOracle/PriceOracleProxy.sol)
- Changed `block.number` to `block.timestamp` for COMP distribution and Interest rates so it's can run on blockchains with different or variable blocktimes
- Added CWrappedNative a CToken that can handle both ETH and wETH
- Implemented EIP-1967 for CErc20Delegator and CWrappedNativeDelegator so future upgrades are easier
- Added ComptrollerManager to manage multiple Comptrollers as once
- Updated Maximillion to handle CWrappedNative

Contracts
=========

We detail a few of the core contracts in the Compound protocol.

<dl>
  <dt>CToken, CErc20 and CEther</dt>
  <dd>The Compound cTokens, which are self-contained borrowing and lending contracts. CToken contains the core logic and CErc20 and CEther add public interfaces for Erc20 tokens and ether, respectively. Each CToken is assigned an interest rate and risk model (see InterestRateModel and Comptroller sections), and allows accounts to *mint* (supply capital), *redeem* (withdraw capital), *borrow* and *repay a borrow*. Each CToken is an ERC-20 compliant token where balances represent ownership of the market.</dd>
</dl>

<dl>
  <dt>Comptroller</dt>
  <dd>The risk model contract, which validates permissible user actions and disallows actions if they do not fit certain risk parameters. For instance, the Comptroller enforces that each borrowing user must maintain a sufficient collateral balance across all cTokens.</dd>
</dl>

<dl>
  <dt>Comp</dt>
  <dd>The Compound Governance Token (COMP). Holders of this token have the ability to govern the protocol via the governor contract.</dd>
</dl>

<dl>
  <dt>Governor Alpha</dt>
  <dd>The administrator of the Compound timelock contract. Holders of Comp token may create and vote on proposals which will be queued into the Compound timelock and then have effects on Compound cToken and Comptroller contracts. This contract may be replaced in the future with a beta version.</dd>
</dl>

<dl>
  <dt>InterestRateModel</dt>
  <dd>Contracts which define interest rate models. These models algorithmically determine interest rates based on the current utilization of a given market (that is, how much of the supplied assets are liquid versus borrowed).</dd>
</dl>

<dl>
  <dt>Careful Math</dt>
  <dd>Library for safe math operations.</dd>
</dl>

<dl>
  <dt>ErrorReporter</dt>
  <dd>Library for tracking error codes and failure conditions.</dd>
</dl>

<dl>
  <dt>Exponential</dt>
  <dd>Library for handling fixed-point decimal numbers.</dd>
</dl>

<dl>
  <dt>SafeToken</dt>
  <dd>Library for safely handling Erc20 interaction.</dd>
</dl>

<dl>
  <dt>WhitePaperInterestRateModel</dt>
  <dd>Initial interest rate model, as defined in the Whitepaper. This contract accepts a base rate and slope parameter in its constructor.</dd>
</dl>

Installation
------------
To run compound, pull the repository from GitHub and install its dependencies. You will need [yarn](https://yarnpkg.com/lang/en/docs/install/) or [npm](https://docs.npmjs.com/cli/install) installed.

    git clone https://github.com/compound-finance/compound-protocol
    cd compound-protocol
    yarn install --lock-file # or `npm install`

Run development environment
----

`yarn hardhat node`

Testing
-------
Jest contract tests are defined under the [tests directory](https://github.com/compound-finance/compound-protocol/tree/master/tests). To run the tests run:

    yarn test

Integration Specs
-----------------

There are additional tests under the [spec/scenario](https://github.com/compound-finance/compound-protocol/tree/master/spec/scenario) folder. These are high-level integration tests based on the scenario runner depicted above. The aim of these tests is to be highly literate and have high coverage in the interaction of contracts.

Code Coverage
-------------
To run code coverage, run:

    yarn coverage

Linting
-------
To lint the code, run:

    yarn lint
