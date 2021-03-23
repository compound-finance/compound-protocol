
# Types
* `name:<Type>` - Helper to describe arguments with names, not actually input this way
* `<Bool>` - `True` or `False`
* `<Number>` - A standard number (e.g. `5` or `6.0` or `10.0e18`)
* `<VToken>` - The local name for a given vToken when created, e.g. `cZRX`
* `<User>` - One of: `Admin, Bank, Geoff, Torrey, Robert, Coburn, Jared`
* `<String>` - A string, may be quoted but does not have to be if a single-word (e.g. `"Mint"` or `Mint`)
* `<Address>` - TODO
* `<Assertion>` - See assertions below.

# Events

## Core Events

* "History n:<Number>=5" - Prints history of actions
  * E.g. "History"
  * E.g. "History 10"
* `Read ...` - Reads given value and prints result
  * E.g. `Read VToken vBAT ExchangeRateStored` - Returns exchange rate of vBAT
* `Assert <Assertion>` - Validates given assertion, raising an exception if assertion fails
  * E.g. `Assert Equal (Erc20 BAT TokenBalance Geoff) (Exactly 5.0)` - Returns exchange rate of vBAT
* `FastForward n:<Number> Blocks` - For `VTokenScenario`, moves the block number forward n blocks. Note: in `VTokenScenario` the current block number is mocked (starting at 100000). Thus, this is the only way for the protocol to see a higher block number (for accruing interest).
  * E.g. `FastForward 5 Blocks` - Move block number forward 5 blocks.
* `Inspect` - Prints debugging information about the world
* `Debug message:<String>` - Same as inspect but prepends with a string
* `From <User> <Event>` - Runs event as the given user
  * E.g. `From Geoff (VToken cZRX Mint 5e18)`
* `Invariant <Invariant>` - Adds a new invariant to the world which is checked after each transaction
  * E.g. `Invariant Static (VToken cZRX TotalSupply)`
* `WipeInvariants` - Removes all invariants.
* `Controller <ControllerEvent>` - Runs given Controller event
  * E.g. `Controller _setReserveFactor 0.5`
* `VToken <VTokenEvent>` - Runs given VToken event
  * E.g. `VToken cZRX Mint 5e18`
* `Erc20 <Erc20Event>` - Runs given Erc20 event
  * E.g. `Erc20 ZRX Facuet Geoff 5e18`
* `InterestRateModel ...event` - Runs given interest rate model event
  * E.g. `InterestRateModel Deployed (Fixed 0.5)`
* `PriceOracle <PriceOracleEvent>` - Runs given Price Oracle event
  * E.g. `PriceOracle SetPrice cZRX 1.5`

## Controller Events

* "Controller Deploy ...controllerParams" - Generates a new Controller
  * E.g. "Controller Deploy Scenario (PriceOracle Address) 0.1 10"
* `Controller SetPaused action:<String> paused:<Bool>` - Pauses or unpaused given vToken function (e.g. Mint)
  * E.g. `Controller SetPaused Mint True`
* `Controller SupportMarket <VToken>` - Adds support in the Controller for the given vToken
  * E.g. `Controller SupportMarket cZRX`
* `Controller EnterMarkets <User> <VToken> ...` - User enters the given markets
  * E.g. `Controller EnterMarkets Geoff cZRX vETH`
* `Controller SetMaxAssets <Number>` - Sets (or resets) the max allowed asset count
  * E.g. `Controller SetMaxAssets 4`
* `VToken <vToken> SetOracle oracle:<Contract>` - Sets the oracle
  * E.g. `Controller SetOracle (Fixed 1.5)`
* `Controller SetCollateralFactor <VToken> <Number>` - Sets the collateral factor for given vToken to number
  * E.g. `Controller SetCollateralFactor cZRX 0.1`
* `FastForward n:<Number> Blocks` - Moves the block number forward `n` blocks. Note: in `VTokenScenario` and `ControllerScenario` the current block number is mocked (starting at 100000). This is the only way for the protocol to see a higher block number (for accruing interest).
  * E.g. `Controller FastForward 5 Blocks` - Move block number forward 5 blocks.

## vToken Events

* `VToken Deploy name:<VToken> underlying:<Contract> controller:<Contract> interestRateModel:<Contract> initialExchangeRate:<Number> decimals:<Number> admin:<Address>` - Generates a new controller and sets to world global
  * E.g. `VToken Deploy cZRX (Erc20 ZRX Address) (Controller Address) (InterestRateModel Address) 1.0 18`
* `VToken <vToken> AccrueInterest` - Accrues interest for given token
  * E.g. `VToken cZRX AccrueInterest`
* `VToken <vToken> Mint <User> amount:<Number>` - Mints the given amount of vToken as specified user
  * E.g. `VToken cZRX Mint Geoff 1.0`
* `VToken <vToken> Redeem <User> amount:<Number>` - Redeems the given amount of vToken as specified user
      * E.g. `VToken cZRX Redeem Geoff 1.0e18`
* `VToken <vToken> Borrow <User> amount:<Number>` - Borrows the given amount of this vToken as specified user
      * E.g. `VToken cZRX Borrow Geoff 1.0e18`
* `VToken <vToken> ReduceReserves amount:<Number>` - Reduces the reserves of the vToken
      * E.g. `VToken cZRX ReduceReserves 1.0e18`
* `VToken <vToken> SetReserveFactor amount:<Number>` - Sets the reserve factor for the vToken
      * E.g. `VToken cZRX SetReserveFactor 0.1`
* `VToken <vToken> SetInterestRateModel interestRateModel:<Contract>` - Sets the interest rate model for the given vToken
  * E.g. `VToken cZRX SetInterestRateModel (Fixed 1.5)`
* `VToken <vToken> SetController controller:<Contract>` - Sets the controller for the given vToken
  * E.g. `VToken cZRX SetController Controller`
* `VToken <vToken> Mock variable:<String> value:<Number>` - Mocks a given value on vToken. Note: value must be a supported mock and this will only work on a VTokenScenario contract.
  * E.g. `VToken cZRX Mock totalBorrows 5.0e18`
  * E.g. `VToken cZRX Mock totalReserves 0.5e18`

## Erc-20 Events

* `Erc20 Deploy name:<Erc20>` - Generates a new ERC-20 token by name
  * E.g. `Erc20 Deploy ZRX`
* `Erc20 <Erc20> Approve <User> <Address> <Amount>` - Adds an allowance between user and address
  * E.g. `Erc20 ZRX Approve Geoff cZRX 1.0e18`
* `Erc20 <Erc20> Faucet <Address> <Amount>` - Adds an arbitrary balance to given user
  * E.g. `Erc20 ZRX Facuet Geoff 1.0e18`

## Price Oracle Events

* `Deploy` - Generates a new price oracle (note: defaults to (Fixed 1.0))
  * E.g. `PriceOracle Deploy (Fixed 1.0)`
  * E.g. `PriceOracle Deploy Simple`
  * E.g. `PriceOracle Deploy NotPriceOracle`
* `SetPrice <VToken> <Amount>` - Sets the per-ether price for the given vToken
  * E.g. `PriceOracle SetPrice cZRX 1.0`

## Interest Rate Model Events

## Deploy

* `Deploy params:<String[]>` - Generates a new interest rate model (note: defaults to (Fixed 0.25))
  * E.g. `InterestRateModel Deploy (Fixed 0.5)`
  * E.g. `InterestRateModel Deploy Whitepaper`

# Values

## Core Values

* `True` - Returns true
* `False` - Returns false
* `Zero` - Returns 0
* `Some` - Returns 100e18
* `Little` - Returns 100e10
* `Exactly <Amount>` - Returns a strict numerical value
  * E.g. `Exactly 5.0`
* `Exp <Amount>` - Returns the mantissa for a given exp
  * E.g. `Exp 5.5`
* `Precisely <Amount>` - Matches a number to given number of significant figures
  * E.g. `Exactly 5.1000` - Matches to 5 sig figs
* `Anything` - Matches anything
* `Nothing` - Matches nothing
* `Default value:<Value> default:<Value>` - Returns value if truthy, otherwise default. Note: this does short-circuit
* `LastContract` - Returns the address of last constructed contract
* `User <...>` - Returns User value (see below)
* `Controller <...>` - Returns Controller value (see below)
* `VToken <...>` - Returns VToken value (see below)
* `Erc20 <...>` - Returns Erc20 value (see below)
* `InterestRateModel <...>` - Returns InterestRateModel value (see below)
* `PriceOracle <...>` - Returns PriceOracle value (see below)

## User Values

* `User <User> Address` - Returns address of user
  * E.g. `User Geoff Address` - Returns Geoff's address

## Controller Values

* `Controller Liquidity <User>` - Returns a given user's trued up liquidity
  * E.g. `Controller Liquidity Geoff`
* `Controller MembershipLength <User>` - Returns a given user's length of membership
  * E.g. `Controller MembershipLength Geoff`
* `Controller CheckMembership <User> <VToken>` - Returns one if user is in asset, zero otherwise.
  * E.g. `Controller CheckMembership Geoff cZRX`
* "Controller CheckListed <VToken>" - Returns true if market is listed, false otherwise.
  * E.g. "Controller CheckListed cZRX"

## VToken Values
* `VToken <VToken> UnderlyingBalance <User>` - Returns a user's underlying balance (based on given exchange rate)
  * E.g. `VToken cZRX UnderlyingBalance Geoff`
* `VToken <VToken> BorrowBalance <User>` - Returns a user's borrow balance (including interest)
  * E.g. `VToken cZRX BorrowBalance Geoff`
* `VToken <VToken> TotalBorrowBalance` - Returns the vToken's total borrow balance
  * E.g. `VToken cZRX TotalBorrowBalance`
* `VToken <VToken> Reserves` - Returns the vToken's total reserves
  * E.g. `VToken cZRX Reserves`
* `VToken <VToken> Controller` - Returns the vToken's controller
  * E.g. `VToken cZRX Controller`
* `VToken <VToken> PriceOracle` - Returns the vToken's price oracle
  * E.g. `VToken cZRX PriceOracle`
* `VToken <VToken> ExchangeRateStored` - Returns the vToken's exchange rate (based on balances stored)
  * E.g. `VToken cZRX ExchangeRateStored`
* `VToken <VToken> ExchangeRate` - Returns the vToken's current exchange rate
  * E.g. `VToken cZRX ExchangeRate`

## Erc-20 Values

* `Erc20 <Erc20> Address` - Returns address of ERC-20 contract
  * E.g. `Erc20 ZRX Address` - Returns ZRX's address
* `Erc20 <Erc20> Name` - Returns name of ERC-20 contract
  * E.g. `Erc20 ZRX Address` - Returns ZRX's name
* `Erc20 <Erc20> Symbol` - Returns symbol of ERC-20 contract
  * E.g. `Erc20 ZRX Symbol` - Returns ZRX's symbol
* `Erc20 <Erc20> Decimals` - Returns number of decimals in ERC-20 contract
  * E.g. `Erc20 ZRX Decimals` - Returns ZRX's decimals
* `Erc20 <Erc20> TotalSupply` - Returns the ERC-20 token's total supply
  * E.g. `Erc20 ZRX TotalSupply`
  * E.g. `Erc20 cZRX TotalSupply`
* `Erc20 <Erc20> TokenBalance <Address>` - Returns the ERC-20 token balance of a given address
  * E.g. `Erc20 ZRX TokenBalance Geoff` - Returns a user's ZRX balance
  * E.g. `Erc20 cZRX TokenBalance Geoff` - Returns a user's cZRX balance
  * E.g. `Erc20 ZRX TokenBalance cZRX` - Returns cZRX's ZRX balance
* `Erc20 <Erc20> Allowance owner:<Address> spender:<Address>` - Returns the ERC-20 allowance from owner to spender
  * E.g. `Erc20 ZRX Allowance Geoff Torrey` - Returns the ZRX allowance of Geoff to Torrey
  * E.g. `Erc20 cZRX Allowance Geoff Coburn` - Returns the cZRX allowance of Geoff to Coburn
  * E.g. `Erc20 ZRX Allowance Geoff cZRX` - Returns the ZRX allowance of Geoff to the cZRX vToken

## PriceOracle Values

* `Address` - Gets the address of the global price oracle
* `Price asset:<Address>` - Gets the price of the given asset

## Interest Rate Model Values

* `Address` - Gets the address of the global interest rate model

# Assertions

* `Equal given:<Value> expected:<Value>` - Asserts that given matches expected.
  * E.g. `Assert Equal (Exactly 0) Zero`
  * E.g. `Assert Equal (VToken cZRX TotalSupply) (Exactly 55)`
  * E.g. `Assert Equal (VToken cZRX Controller) (Controller Address)`
* `True given:<Value>` - Asserts that given is true.
  * E.g. `Assert True (Controller CheckMembership Geoff vETH)`
* `False given:<Value>` - Asserts that given is false.
  * E.g. `Assert False (Controller CheckMembership Geoff vETH)`
* `Failure error:<String> info:<String> detail:<Number?>` - Asserts that last transaction had a graceful failure with given error, info and detail.
  * E.g. `Assert Failure UNAUTHORIZED SUPPORT_MARKET_OWNER_CHECK`
  * E.g. `Assert Failure MATH_ERROR MINT_CALCULATE_BALANCE 5`
* `Revert` - Asserts that the last transaction reverted.
* `Success` - Asserts that the last transaction completed successfully (that is, did not revert nor emit graceful failure).
* `Log name:<String> ((key:<String> value:<Value>) ...)` - Asserts that last transaction emitted log with given name and key-value pairs.
  * E.g. `Assert Log Minted (("account" (User Geoff address)) ("amount" (Exactly 55)))`
