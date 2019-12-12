[![CircleCI](https://circleci.com/gh/compound-finance/compound-protocol.svg?style=svg&circle-token=5ed19932325c559a06f71f87d69012aedd2cf3fb)](https://circleci.com/gh/compound-finance/compound-protocol) [![codecov](https://codecov.io/gh/compound-finance/compound-protocol/branch/master/graph/badge.svg?token=q4UvsvVzOX)](https://codecov.io/gh/compound-finance/compound-protocol)

Compound Protocol
=================

The Compound Protocol is an Ethereum smart contract for supplying or borrowing assets. Through the cToken contracts, accounts on the blockchain *supply* capital (Ether or ERC-20 tokens) to receive cTokens or *borrow* assets from the protocol (holding other assets as collateral). The Compound cToken contracts track these balances and algorithmically set interest rates for borrowers.

Before getting started with this repo, please read:

* The [Compound Whitepaper](https://github.com/compound-finance/compound-protocol/tree/master/docs/CompoundWhitepaper.pdf), describing how Compound works
* The [Compound Protocol Specification](https://github.com/compound-finance/compound-protocol/tree/master/docs/CompoundProtocol.pdf), explaining in plain English how the protocol operates

For questions about interacting with Compound, please visit [our Discord server](https://compound.finance/discord).

For security concerns, please visit [https://compound.finance/security](https://compound.finance/security) or email [security@compound.finance](mailto:security@compound.finance).

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
    yarn # or `npm install`

You can then compile and deploy the contracts with:

    yarn run deploy

Note: this project does not use truffle migrations. The command above is the best way to deploy contracts. To view the addresses of contracts, please inspect the `networks/development.json` file that is produced as an artifact of that command.

Console
-------

After you deploy, as above, you can run a truffle console with the following command:

    yarn run console

This command will create a truffle-like build directory and start a truffle console, thus you can then run:

    truffle(rinkeby)> cDAI.deployed().then((cdai) => cdai.borrowRatePerBlock.call())
    <BN: 7699bf9dd>

You can also specify a network (rinkeby, ropsten, kovan, goerli or mainnet):

    yarn run console rinkeby

REPL
----

The Compound Protocol has a simple scenario evaluation tool to test and evaluate scenarios which could occur on the blockchain. This is primarily used for constructing high-level integration tests. The tool also has a REPL to interact with local the Compound Protocol (similar to `truffle console`).

    yarn run repl

    > Read CToken cBAT Address
    Command: Read CToken cBAT Address
    AddressV<val=0xAD53863b864AE703D31b819d29c14cDA93D7c6a6>

You can read more about the scenario runner in the [Scenario Docs](https://github.com/compound-finance/compound-protocol/tree/master/scenario/SCENARIO.md) on steps for using the repl.

Deployment
----------

The easiest way to deploy some Erc20 tokens, cTokens and a Comptroller is through scenario scripts.

Testing
-------
Mocha contract tests are defined under the [test directory](https://github.com/compound-finance/compound-protocol/tree/master/test). To run the tests run:

    yarn run test

or with inspection (visit chrome://inspect) and look for a remote target after running:

    node --inspect node_modules/truffle-core/cli.js test

Assertions used in our tests are provided by [ChaiJS](http://chaijs.com).

Integration Specs
-----------------

There are additional tests under the [spec/scenario](https://github.com/compound-finance/compound-protocol/tree/master/spec/scenario) folder. These are high-level integration tests based on the scenario runner depicted above. The aim of these tests is to be highly literate and have high coverage in the interaction of contracts.

Formal Verification Specs
-------------------------

The Compound Protocol has a number of formal verification specifications, powered by [Certora](https://www.certora.com/). You can find details in the [spec/formal](https://github.com/compound-finance/compound-protocol/tree/master/spec/formal) folder. The Certora Verification Language (CVL) files included are specifications, which when with the Certora CLI tool, produce formal proofs (or counter-examples) that the code of a given contract exactly matches that specification.

Code Coverage
-------------
To run code coverage, run:

    scripts/ganache-coverage # run ganache in coverage mode
    yarn run coverage

Linting
-------
To lint the code, run:

    yarn run lint

Docker
------

To run in docker:

    # Build the docker image
    docker build -t compound-protocol .

    # Run a shell to the built image
    docker run -it compound-protocol /bin/sh

From within a docker shell, you can interact locally with the protocol via ganache and truffle:

    > ganache-cli &
    > yarn run deploy
    > yarn run console
    truffle(development)> cDAI.deployed().then((contract) => cdai = contract);
    truffle(development)> cdai.borrowRatePerBlock.call().then((rate) => rate.toNumber())
    20

Discussion
----------

For any concerns with the protocol, visit us on [Discord](https://compound.finance/discord) to discuss.

_© Copyright 2019, Compound Labs, Inc._
