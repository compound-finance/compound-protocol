import { Event } from '../Event';
import { World } from '../World';
import { VErc20Delegate } from '../Contract/VErc20Delegate';
import {
  getCoreValue,
  mapValue
} from '../CoreValue';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import {
  AddressV,
  Value,
} from '../Value';
import { getWorldContractByAddress, getVTokenDelegateAddress } from '../ContractLookup';

export async function getVTokenDelegateV(world: World, event: Event): Promise<VErc20Delegate> {
  const address = await mapValue<AddressV>(
    world,
    event,
    (str) => new AddressV(getVTokenDelegateAddress(world, str)),
    getCoreValue,
    AddressV
  );

  return getWorldContractByAddress<VErc20Delegate>(world, address.val);
}

async function vTokenDelegateAddress(world: World, vTokenDelegate: VErc20Delegate): Promise<AddressV> {
  return new AddressV(vTokenDelegate._address);
}

export function vTokenDelegateFetchers() {
  return [
    new Fetcher<{ vTokenDelegate: VErc20Delegate }, AddressV>(`
        #### Address

        * "VTokenDelegate <VTokenDelegate> Address" - Returns address of VTokenDelegate contract
          * E.g. "VTokenDelegate vDaiDelegate Address" - Returns vDaiDelegate's address
      `,
      "Address",
      [
        new Arg("vTokenDelegate", getVTokenDelegateV)
      ],
      (world, { vTokenDelegate }) => vTokenDelegateAddress(world, vTokenDelegate),
      { namePos: 1 }
    ),
  ];
}

export async function getVTokenDelegateValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("VTokenDelegate", vTokenDelegateFetchers(), world, event);
}
