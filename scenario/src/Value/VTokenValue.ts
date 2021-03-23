import { Event } from '../Event';
import { World } from '../World';
import { VToken } from '../Contract/VToken';
import { VErc20Delegator } from '../Contract/VErc20Delegator';
import { Erc20 } from '../Contract/Erc20';
import {
  getAddressV,
  getCoreValue,
  getStringV,
  mapValue
} from '../CoreValue';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import {
  AddressV,
  NumberV,
  Value,
  StringV
} from '../Value';
import { getWorldContractByAddress, getVTokenAddress } from '../ContractLookup';

export async function getVTokenV(world: World, event: Event): Promise<VToken> {
  const address = await mapValue<AddressV>(
    world,
    event,
    (str) => new AddressV(getVTokenAddress(world, str)),
    getCoreValue,
    AddressV
  );

  return getWorldContractByAddress<VToken>(world, address.val);
}

export async function getVErc20DelegatorV(world: World, event: Event): Promise<VErc20Delegator> {
  const address = await mapValue<AddressV>(
    world,
    event,
    (str) => new AddressV(getVTokenAddress(world, str)),
    getCoreValue,
    AddressV
  );

  return getWorldContractByAddress<VErc20Delegator>(world, address.val);
}

async function getInterestRateModel(world: World, vToken: VToken): Promise<AddressV> {
  return new AddressV(await vToken.methods.interestRateModel().call());
}

async function vTokenAddress(world: World, vToken: VToken): Promise<AddressV> {
  return new AddressV(vToken._address);
}

async function getVTokenAdmin(world: World, vToken: VToken): Promise<AddressV> {
  return new AddressV(await vToken.methods.admin().call());
}

async function getVTokenPendingAdmin(world: World, vToken: VToken): Promise<AddressV> {
  return new AddressV(await vToken.methods.pendingAdmin().call());
}

async function balanceOfUnderlying(world: World, vToken: VToken, user: string): Promise<NumberV> {
  return new NumberV(await vToken.methods.balanceOfUnderlying(user).call());
}

async function getBorrowBalance(world: World, vToken: VToken, user): Promise<NumberV> {
  return new NumberV(await vToken.methods.borrowBalanceCurrent(user).call());
}

async function getBorrowBalanceStored(world: World, vToken: VToken, user): Promise<NumberV> {
  return new NumberV(await vToken.methods.borrowBalanceStored(user).call());
}

async function getTotalBorrows(world: World, vToken: VToken): Promise<NumberV> {
  return new NumberV(await vToken.methods.totalBorrows().call());
}

async function getTotalBorrowsCurrent(world: World, vToken: VToken): Promise<NumberV> {
  return new NumberV(await vToken.methods.totalBorrowsCurrent().call());
}

async function getReserveFactor(world: World, vToken: VToken): Promise<NumberV> {
  return new NumberV(await vToken.methods.reserveFactorMantissa().call(), 1.0e18);
}

async function getTotalReserves(world: World, vToken: VToken): Promise<NumberV> {
  return new NumberV(await vToken.methods.totalReserves().call());
}

async function getController(world: World, vToken: VToken): Promise<AddressV> {
  return new AddressV(await vToken.methods.controller().call());
}

async function getExchangeRateStored(world: World, vToken: VToken): Promise<NumberV> {
  return new NumberV(await vToken.methods.exchangeRateStored().call());
}

async function getExchangeRate(world: World, vToken: VToken): Promise<NumberV> {
  return new NumberV(await vToken.methods.exchangeRateCurrent().call(), 1e18);
}

async function getCash(world: World, vToken: VToken): Promise<NumberV> {
  return new NumberV(await vToken.methods.getCash().call());
}

async function getInterestRate(world: World, vToken: VToken): Promise<NumberV> {
  return new NumberV(await vToken.methods.borrowRatePerBlock().call(), 1.0e18 / 2102400);
}

async function getImplementation(world: World, vToken: VToken): Promise<AddressV> {
  return new AddressV(await (vToken as VErc20Delegator).methods.implementation().call());
}

export function vTokenFetchers() {
  return [
    new Fetcher<{ vToken: VToken }, AddressV>(`
        #### Address

        * "VToken <VToken> Address" - Returns address of VToken contract
          * E.g. "VToken cZRX Address" - Returns cZRX's address
      `,
      "Address",
      [
        new Arg("vToken", getVTokenV)
      ],
      (world, { vToken }) => vTokenAddress(world, vToken),
      { namePos: 1 }
    ),

    new Fetcher<{ vToken: VToken }, AddressV>(`
        #### InterestRateModel

        * "VToken <VToken> InterestRateModel" - Returns the interest rate model of VToken contract
          * E.g. "VToken cZRX InterestRateModel" - Returns cZRX's interest rate model
      `,
      "InterestRateModel",
      [
        new Arg("vToken", getVTokenV)
      ],
      (world, { vToken }) => getInterestRateModel(world, vToken),
      { namePos: 1 }
    ),

    new Fetcher<{ vToken: VToken }, AddressV>(`
        #### Admin

        * "VToken <VToken> Admin" - Returns the admin of VToken contract
          * E.g. "VToken cZRX Admin" - Returns cZRX's admin
      `,
      "Admin",
      [
        new Arg("vToken", getVTokenV)
      ],
      (world, { vToken }) => getVTokenAdmin(world, vToken),
      { namePos: 1 }
    ),

    new Fetcher<{ vToken: VToken }, AddressV>(`
        #### PendingAdmin

        * "VToken <VToken> PendingAdmin" - Returns the pending admin of VToken contract
          * E.g. "VToken cZRX PendingAdmin" - Returns cZRX's pending admin
      `,
      "PendingAdmin",
      [
        new Arg("vToken", getVTokenV)
      ],
      (world, { vToken }) => getVTokenPendingAdmin(world, vToken),
      { namePos: 1 }
    ),

    new Fetcher<{ vToken: VToken }, AddressV>(`
        #### Underlying

        * "VToken <VToken> Underlying" - Returns the underlying asset (if applicable)
          * E.g. "VToken cZRX Underlying"
      `,
      "Underlying",
      [
        new Arg("vToken", getVTokenV)
      ],
      async (world, { vToken }) => new AddressV(await vToken.methods.underlying().call()),
      { namePos: 1 }
    ),

    new Fetcher<{ vToken: VToken, address: AddressV }, NumberV>(`
        #### UnderlyingBalance

        * "VToken <VToken> UnderlyingBalance <User>" - Returns a user's underlying balance (based on given exchange rate)
          * E.g. "VToken cZRX UnderlyingBalance Geoff"
      `,
      "UnderlyingBalance",
      [
        new Arg("vToken", getVTokenV),
        new Arg<AddressV>("address", getAddressV)
      ],
      (world, { vToken, address }) => balanceOfUnderlying(world, vToken, address.val),
      { namePos: 1 }
    ),

    new Fetcher<{ vToken: VToken, address: AddressV }, NumberV>(`
        #### BorrowBalance

        * "VToken <VToken> BorrowBalance <User>" - Returns a user's borrow balance (including interest)
          * E.g. "VToken cZRX BorrowBalance Geoff"
      `,
      "BorrowBalance",
      [
        new Arg("vToken", getVTokenV),
        new Arg("address", getAddressV)
      ],
      (world, { vToken, address }) => getBorrowBalance(world, vToken, address.val),
      { namePos: 1 }
    ),

    new Fetcher<{ vToken: VToken, address: AddressV }, NumberV>(`
        #### BorrowBalanceStored

        * "VToken <VToken> BorrowBalanceStored <User>" - Returns a user's borrow balance (without specifically re-accruing interest)
          * E.g. "VToken cZRX BorrowBalanceStored Geoff"
      `,
      "BorrowBalanceStored",
      [
        new Arg("vToken", getVTokenV),
        new Arg("address", getAddressV)
      ],
      (world, { vToken, address }) => getBorrowBalanceStored(world, vToken, address.val),
      { namePos: 1 }
    ),

    new Fetcher<{ vToken: VToken }, NumberV>(`
        #### TotalBorrows

        * "VToken <VToken> TotalBorrows" - Returns the vToken's total borrow balance
          * E.g. "VToken cZRX TotalBorrows"
      `,
      "TotalBorrows",
      [
        new Arg("vToken", getVTokenV)
      ],
      (world, { vToken }) => getTotalBorrows(world, vToken),
      { namePos: 1 }
    ),

    new Fetcher<{ vToken: VToken }, NumberV>(`
        #### TotalBorrowsCurrent

        * "VToken <VToken> TotalBorrowsCurrent" - Returns the vToken's total borrow balance with interest
          * E.g. "VToken cZRX TotalBorrowsCurrent"
      `,
      "TotalBorrowsCurrent",
      [
        new Arg("vToken", getVTokenV)
      ],
      (world, { vToken }) => getTotalBorrowsCurrent(world, vToken),
      { namePos: 1 }
    ),

    new Fetcher<{ vToken: VToken }, NumberV>(`
        #### Reserves

        * "VToken <VToken> Reserves" - Returns the vToken's total reserves
          * E.g. "VToken cZRX Reserves"
      `,
      "Reserves",
      [
        new Arg("vToken", getVTokenV)
      ],
      (world, { vToken }) => getTotalReserves(world, vToken),
      { namePos: 1 }
    ),

    new Fetcher<{ vToken: VToken }, NumberV>(`
        #### ReserveFactor

        * "VToken <VToken> ReserveFactor" - Returns reserve factor of VToken contract
          * E.g. "VToken cZRX ReserveFactor" - Returns cZRX's reserve factor
      `,
      "ReserveFactor",
      [
        new Arg("vToken", getVTokenV)
      ],
      (world, { vToken }) => getReserveFactor(world, vToken),
      { namePos: 1 }
    ),

    new Fetcher<{ vToken: VToken }, AddressV>(`
        #### Controller

        * "VToken <VToken> Controller" - Returns the vToken's controller
          * E.g. "VToken cZRX Controller"
      `,
      "Controller",
      [
        new Arg("vToken", getVTokenV)
      ],
      (world, { vToken }) => getController(world, vToken),
      { namePos: 1 }
    ),

    new Fetcher<{ vToken: VToken }, NumberV>(`
        #### ExchangeRateStored

        * "VToken <VToken> ExchangeRateStored" - Returns the vToken's exchange rate (based on balances stored)
          * E.g. "VToken cZRX ExchangeRateStored"
      `,
      "ExchangeRateStored",
      [
        new Arg("vToken", getVTokenV)
      ],
      (world, { vToken }) => getExchangeRateStored(world, vToken),
      { namePos: 1 }
    ),

    new Fetcher<{ vToken: VToken }, NumberV>(`
        #### ExchangeRate

        * "VToken <VToken> ExchangeRate" - Returns the vToken's current exchange rate
          * E.g. "VToken cZRX ExchangeRate"
      `,
      "ExchangeRate",
      [
        new Arg("vToken", getVTokenV)
      ],
      (world, { vToken }) => getExchangeRate(world, vToken),
      { namePos: 1 }
    ),

    new Fetcher<{ vToken: VToken }, NumberV>(`
        #### Cash

        * "VToken <VToken> Cash" - Returns the vToken's current cash
          * E.g. "VToken cZRX Cash"
      `,
      "Cash",
      [
        new Arg("vToken", getVTokenV)
      ],
      (world, { vToken }) => getCash(world, vToken),
      { namePos: 1 }
    ),

    new Fetcher<{ vToken: VToken }, NumberV>(`
        #### InterestRate

        * "VToken <VToken> InterestRate" - Returns the vToken's current interest rate
          * E.g. "VToken cZRX InterestRate"
      `,
      "InterestRate",
      [
        new Arg("vToken", getVTokenV)
      ],
      (world, {vToken}) => getInterestRate(world, vToken),
      {namePos: 1}
    ),
    new Fetcher<{vToken: VToken, signature: StringV}, NumberV>(`
        #### CallNum

        * "VToken <VToken> Call <signature>" - Simple direct call method, for now with no parameters
          * E.g. "VToken cZRX Call \"borrowIndex()\""
      `,
      "CallNum",
      [
        new Arg("vToken", getVTokenV),
        new Arg("signature", getStringV),
      ],
      async (world, {vToken, signature}) => {
        const res = await world.web3.eth.call({
            to: vToken._address,
            data: world.web3.eth.abi.encodeFunctionSignature(signature.val)
          })
        const resNum : any = world.web3.eth.abi.decodeParameter('uint256',res);
        return new NumberV(resNum);
      }
      ,
      {namePos: 1}
    ),
    new Fetcher<{ vToken: VToken }, AddressV>(`
        #### Implementation

        * "VToken <VToken> Implementation" - Returns the vToken's current implementation
          * E.g. "VToken vDAI Implementation"
      `,
      "Implementation",
      [
        new Arg("vToken", getVTokenV)
      ],
      (world, { vToken }) => getImplementation(world, vToken),
      { namePos: 1 }
    )
  ];
}

export async function getVTokenValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("vToken", vTokenFetchers(), world, event);
}
