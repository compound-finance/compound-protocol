import {Event} from '../Event';
import {World} from '../World';
import {ControllerImpl} from '../Contract/ControllerImpl';
import {
  getAddressV
} from '../CoreValue';
import {
  AddressV,
  Value
} from '../Value';
import {Arg, Fetcher, getFetcherValue} from '../Command';
import {getControllerImpl} from '../ContractLookup';

export async function getControllerImplAddress(world: World, controllerImpl: ControllerImpl): Promise<AddressV> {
  return new AddressV(controllerImpl._address);
}

export function controllerImplFetchers() {
  return [
    new Fetcher<{controllerImpl: ControllerImpl}, AddressV>(`
        #### Address

        * "ControllerImpl Address" - Returns address of controller implementation
      `,
      "Address",
      [new Arg("controllerImpl", getControllerImpl)],
      (world, {controllerImpl}) => getControllerImplAddress(world, controllerImpl),
      {namePos: 1}
    )
  ];
}

export async function getControllerImplValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("ControllerImpl", controllerImplFetchers(), world, event);
}
