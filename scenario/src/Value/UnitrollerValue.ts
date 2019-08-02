import {Event} from '../Event';
import {World} from '../World';
import {Unitroller} from '../Contract/Unitroller';
import {
  getAddressV
} from '../CoreValue';
import {
  AddressV,
  Value
} from '../Value';
import {Arg, Fetcher, getFetcherValue} from '../Command';
import {getUnitroller} from '../ContractLookup';

export async function getUnitrollerAddress(world: World, unitroller: Unitroller): Promise<AddressV> {
  return new AddressV(unitroller._address);
}

export function unitrollerFetchers() {
  return [
    new Fetcher<{unitroller: Unitroller}, AddressV>(`
        #### Address

        * "Unitroller Address" - Returns address of unitroller
      `,
      "Address",
      [new Arg("unitroller", getUnitroller, {implicit: true})],
      (world, {unitroller}) => getUnitrollerAddress(world, unitroller)
    )
  ];
}

export async function getUnitrollerValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("Unitroller", unitrollerFetchers(), world, event);
}
