import { Event } from "../Event";
import { World } from "../World";
import { XErc20Delegate } from "../Contract/XErc20Delegate";
import { getCoreValue, mapValue } from "../CoreValue";
import { Arg, Fetcher, getFetcherValue } from "../Command";
import { AddressV, Value } from "../Value";
import {
  getWorldContractByAddress,
  getXTokenDelegateAddress,
} from "../ContractLookup";

export async function getXTokenDelegateV(
  world: World,
  event: Event
): Promise<XErc20Delegate> {
  const address = await mapValue<AddressV>(
    world,
    event,
    (str) => new AddressV(getXTokenDelegateAddress(world, str)),
    getCoreValue,
    AddressV
  );

  return getWorldContractByAddress<XErc20Delegate>(world, address.val);
}

async function cTokenDelegateAddress(
  world: World,
  cTokenDelegate: XErc20Delegate
): Promise<AddressV> {
  return new AddressV(cTokenDelegate._address);
}

export function cTokenDelegateFetchers() {
  return [
    new Fetcher<{ cTokenDelegate: XErc20Delegate }, AddressV>(
      `
        #### Address

        * "XTokenDelegate <XTokenDelegate> Address" - Returns address of XTokenDelegate contract
          * E.g. "XTokenDelegate cDaiDelegate Address" - Returns cDaiDelegate's address
      `,
      "Address",
      [new Arg("cTokenDelegate", getXTokenDelegateV)],
      (world, { cTokenDelegate }) =>
        cTokenDelegateAddress(world, cTokenDelegate),
      { namePos: 1 }
    ),
  ];
}

export async function getXTokenDelegateValue(
  world: World,
  event: Event
): Promise<Value> {
  return await getFetcherValue<any, any>(
    "XTokenDelegate",
    cTokenDelegateFetchers(),
    world,
    event
  );
}
