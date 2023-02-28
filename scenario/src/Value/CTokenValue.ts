import { Event } from "../Event";
import { World } from "../World";
import { XToken } from "../Contract/XToken";
import { XErc20Delegator } from "../Contract/XErc20Delegator";
import { Erc20 } from "../Contract/Erc20";
import { getAddressV, getCoreValue, getStringV, mapValue } from "../CoreValue";
import { Arg, Fetcher, getFetcherValue } from "../Command";
import { AddressV, NumberV, Value, StringV } from "../Value";
import { getWorldContractByAddress, getXTokenAddress } from "../ContractLookup";

export async function getXTokenV(world: World, event: Event): Promise<XToken> {
  const address = await mapValue<AddressV>(
    world,
    event,
    (str) => new AddressV(getXTokenAddress(world, str)),
    getCoreValue,
    AddressV
  );

  return getWorldContractByAddress<XToken>(world, address.val);
}

export async function getXErc20DelegatorV(
  world: World,
  event: Event
): Promise<XErc20Delegator> {
  const address = await mapValue<AddressV>(
    world,
    event,
    (str) => new AddressV(getXTokenAddress(world, str)),
    getCoreValue,
    AddressV
  );

  return getWorldContractByAddress<XErc20Delegator>(world, address.val);
}

async function getInterestRateModel(
  world: World,
  cToken: XToken
): Promise<AddressV> {
  return new AddressV(await cToken.methods.interestRateModel().call());
}

async function cTokenAddress(world: World, cToken: XToken): Promise<AddressV> {
  return new AddressV(cToken._address);
}

async function getXTokenAdmin(world: World, cToken: XToken): Promise<AddressV> {
  return new AddressV(await cToken.methods.admin().call());
}

async function getXTokenPendingAdmin(
  world: World,
  cToken: XToken
): Promise<AddressV> {
  return new AddressV(await cToken.methods.pendingAdmin().call());
}

async function balanceOfUnderlying(
  world: World,
  cToken: XToken,
  user: string
): Promise<NumberV> {
  return new NumberV(await cToken.methods.balanceOfUnderlying(user).call());
}

async function getBorrowBalance(
  world: World,
  cToken: XToken,
  user
): Promise<NumberV> {
  return new NumberV(await cToken.methods.borrowBalanceCurrent(user).call());
}

async function getBorrowBalanceStored(
  world: World,
  cToken: XToken,
  user
): Promise<NumberV> {
  return new NumberV(await cToken.methods.borrowBalanceStored(user).call());
}

async function getTotalBorrows(world: World, cToken: XToken): Promise<NumberV> {
  return new NumberV(await cToken.methods.totalBorrows().call());
}

async function getTotalBorrowsCurrent(
  world: World,
  cToken: XToken
): Promise<NumberV> {
  return new NumberV(await cToken.methods.totalBorrowsCurrent().call());
}

async function getReserveFactor(
  world: World,
  cToken: XToken
): Promise<NumberV> {
  return new NumberV(
    await cToken.methods.reserveFactorMantissa().call(),
    1.0e18
  );
}

async function getTotalReserves(
  world: World,
  cToken: XToken
): Promise<NumberV> {
  return new NumberV(await cToken.methods.totalReserves().call());
}

async function getComptroller(world: World, cToken: XToken): Promise<AddressV> {
  return new AddressV(await cToken.methods.comptroller().call());
}

async function getExchangeRateStored(
  world: World,
  cToken: XToken
): Promise<NumberV> {
  return new NumberV(await cToken.methods.exchangeRateStored().call());
}

async function getExchangeRate(world: World, cToken: XToken): Promise<NumberV> {
  return new NumberV(await cToken.methods.exchangeRateCurrent().call(), 1e18);
}

async function getCash(world: World, cToken: XToken): Promise<NumberV> {
  return new NumberV(await cToken.methods.getCash().call());
}

async function getInterestRate(world: World, cToken: XToken): Promise<NumberV> {
  return new NumberV(
    await cToken.methods.borrowRatePerBlock().call(),
    1.0e18 / 2102400
  );
}

async function getImplementation(
  world: World,
  cToken: XToken
): Promise<AddressV> {
  return new AddressV(
    await (cToken as XErc20Delegator).methods.implementation().call()
  );
}

export function cTokenFetchers() {
  return [
    new Fetcher<{ cToken: XToken }, AddressV>(
      `
        #### Address

        * "XToken <XToken> Address" - Returns address of XToken contract
          * E.g. "XToken cZRX Address" - Returns cZRX's address
      `,
      "Address",
      [new Arg("cToken", getXTokenV)],
      (world, { cToken }) => cTokenAddress(world, cToken),
      { namePos: 1 }
    ),

    new Fetcher<{ cToken: XToken }, AddressV>(
      `
        #### InterestRateModel

        * "XToken <XToken> InterestRateModel" - Returns the interest rate model of XToken contract
          * E.g. "XToken cZRX InterestRateModel" - Returns cZRX's interest rate model
      `,
      "InterestRateModel",
      [new Arg("cToken", getXTokenV)],
      (world, { cToken }) => getInterestRateModel(world, cToken),
      { namePos: 1 }
    ),

    new Fetcher<{ cToken: XToken }, AddressV>(
      `
        #### Admin

        * "XToken <XToken> Admin" - Returns the admin of XToken contract
          * E.g. "XToken cZRX Admin" - Returns cZRX's admin
      `,
      "Admin",
      [new Arg("cToken", getXTokenV)],
      (world, { cToken }) => getXTokenAdmin(world, cToken),
      { namePos: 1 }
    ),

    new Fetcher<{ cToken: XToken }, AddressV>(
      `
        #### PendingAdmin

        * "XToken <XToken> PendingAdmin" - Returns the pending admin of XToken contract
          * E.g. "XToken cZRX PendingAdmin" - Returns cZRX's pending admin
      `,
      "PendingAdmin",
      [new Arg("cToken", getXTokenV)],
      (world, { cToken }) => getXTokenPendingAdmin(world, cToken),
      { namePos: 1 }
    ),

    new Fetcher<{ cToken: XToken }, AddressV>(
      `
        #### Underlying

        * "XToken <XToken> Underlying" - Returns the underlying asset (if applicable)
          * E.g. "XToken cZRX Underlying"
      `,
      "Underlying",
      [new Arg("cToken", getXTokenV)],
      async (world, { cToken }) =>
        new AddressV(await cToken.methods.underlying().call()),
      { namePos: 1 }
    ),

    new Fetcher<{ cToken: XToken; address: AddressV }, NumberV>(
      `
        #### UnderlyingBalance

        * "XToken <XToken> UnderlyingBalance <User>" - Returns a user's underlying balance (based on given exchange rate)
          * E.g. "XToken cZRX UnderlyingBalance Geoff"
      `,
      "UnderlyingBalance",
      [
        new Arg("cToken", getXTokenV),
        new Arg<AddressV>("address", getAddressV),
      ],
      (world, { cToken, address }) =>
        balanceOfUnderlying(world, cToken, address.val),
      { namePos: 1 }
    ),

    new Fetcher<{ cToken: XToken; address: AddressV }, NumberV>(
      `
        #### BorrowBalance

        * "XToken <XToken> BorrowBalance <User>" - Returns a user's borrow balance (including interest)
          * E.g. "XToken cZRX BorrowBalance Geoff"
      `,
      "BorrowBalance",
      [new Arg("cToken", getXTokenV), new Arg("address", getAddressV)],
      (world, { cToken, address }) =>
        getBorrowBalance(world, cToken, address.val),
      { namePos: 1 }
    ),

    new Fetcher<{ cToken: XToken; address: AddressV }, NumberV>(
      `
        #### BorrowBalanceStored

        * "XToken <XToken> BorrowBalanceStored <User>" - Returns a user's borrow balance (without specifically re-accruing interest)
          * E.g. "XToken cZRX BorrowBalanceStored Geoff"
      `,
      "BorrowBalanceStored",
      [new Arg("cToken", getXTokenV), new Arg("address", getAddressV)],
      (world, { cToken, address }) =>
        getBorrowBalanceStored(world, cToken, address.val),
      { namePos: 1 }
    ),

    new Fetcher<{ cToken: XToken }, NumberV>(
      `
        #### TotalBorrows

        * "XToken <XToken> TotalBorrows" - Returns the cToken's total borrow balance
          * E.g. "XToken cZRX TotalBorrows"
      `,
      "TotalBorrows",
      [new Arg("cToken", getXTokenV)],
      (world, { cToken }) => getTotalBorrows(world, cToken),
      { namePos: 1 }
    ),

    new Fetcher<{ cToken: XToken }, NumberV>(
      `
        #### TotalBorrowsCurrent

        * "XToken <XToken> TotalBorrowsCurrent" - Returns the cToken's total borrow balance with interest
          * E.g. "XToken cZRX TotalBorrowsCurrent"
      `,
      "TotalBorrowsCurrent",
      [new Arg("cToken", getXTokenV)],
      (world, { cToken }) => getTotalBorrowsCurrent(world, cToken),
      { namePos: 1 }
    ),

    new Fetcher<{ cToken: XToken }, NumberV>(
      `
        #### Reserves

        * "XToken <XToken> Reserves" - Returns the cToken's total reserves
          * E.g. "XToken cZRX Reserves"
      `,
      "Reserves",
      [new Arg("cToken", getXTokenV)],
      (world, { cToken }) => getTotalReserves(world, cToken),
      { namePos: 1 }
    ),

    new Fetcher<{ cToken: XToken }, NumberV>(
      `
        #### ReserveFactor

        * "XToken <XToken> ReserveFactor" - Returns reserve factor of XToken contract
          * E.g. "XToken cZRX ReserveFactor" - Returns cZRX's reserve factor
      `,
      "ReserveFactor",
      [new Arg("cToken", getXTokenV)],
      (world, { cToken }) => getReserveFactor(world, cToken),
      { namePos: 1 }
    ),

    new Fetcher<{ cToken: XToken }, AddressV>(
      `
        #### Comptroller

        * "XToken <XToken> Comptroller" - Returns the cToken's comptroller
          * E.g. "XToken cZRX Comptroller"
      `,
      "Comptroller",
      [new Arg("cToken", getXTokenV)],
      (world, { cToken }) => getComptroller(world, cToken),
      { namePos: 1 }
    ),

    new Fetcher<{ cToken: XToken }, NumberV>(
      `
        #### ExchangeRateStored

        * "XToken <XToken> ExchangeRateStored" - Returns the cToken's exchange rate (based on balances stored)
          * E.g. "XToken cZRX ExchangeRateStored"
      `,
      "ExchangeRateStored",
      [new Arg("cToken", getXTokenV)],
      (world, { cToken }) => getExchangeRateStored(world, cToken),
      { namePos: 1 }
    ),

    new Fetcher<{ cToken: XToken }, NumberV>(
      `
        #### ExchangeRate

        * "XToken <XToken> ExchangeRate" - Returns the cToken's current exchange rate
          * E.g. "XToken cZRX ExchangeRate"
      `,
      "ExchangeRate",
      [new Arg("cToken", getXTokenV)],
      (world, { cToken }) => getExchangeRate(world, cToken),
      { namePos: 1 }
    ),

    new Fetcher<{ cToken: XToken }, NumberV>(
      `
        #### Cash

        * "XToken <XToken> Cash" - Returns the cToken's current cash
          * E.g. "XToken cZRX Cash"
      `,
      "Cash",
      [new Arg("cToken", getXTokenV)],
      (world, { cToken }) => getCash(world, cToken),
      { namePos: 1 }
    ),

    new Fetcher<{ cToken: XToken }, NumberV>(
      `
        #### InterestRate

        * "XToken <XToken> InterestRate" - Returns the cToken's current interest rate
          * E.g. "XToken cZRX InterestRate"
      `,
      "InterestRate",
      [new Arg("cToken", getXTokenV)],
      (world, { cToken }) => getInterestRate(world, cToken),
      { namePos: 1 }
    ),
    new Fetcher<{ cToken: XToken; signature: StringV }, NumberV>(
      `
        #### CallNum

        * "XToken <XToken> Call <signature>" - Simple direct call method, for now with no parameters
          * E.g. "XToken cZRX Call \"borrowIndex()\""
      `,
      "CallNum",
      [new Arg("cToken", getXTokenV), new Arg("signature", getStringV)],
      async (world, { cToken, signature }) => {
        const res = await world.web3.eth.call({
          to: cToken._address,
          data: world.web3.eth.abi.encodeFunctionSignature(signature.val),
        });
        const resNum: any = world.web3.eth.abi.decodeParameter("uint256", res);
        return new NumberV(resNum);
      },
      { namePos: 1 }
    ),
    new Fetcher<{ cToken: XToken }, AddressV>(
      `
        #### Implementation

        * "XToken <XToken> Implementation" - Returns the cToken's current implementation
          * E.g. "XToken cDAI Implementation"
      `,
      "Implementation",
      [new Arg("cToken", getXTokenV)],
      (world, { cToken }) => getImplementation(world, cToken),
      { namePos: 1 }
    ),
  ];
}

export async function getXTokenValue(
  world: World,
  event: Event
): Promise<Value> {
  return await getFetcherValue<any, any>(
    "cToken",
    cTokenFetchers(),
    world,
    event
  );
}
