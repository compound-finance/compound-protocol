import {Event} from '../Event';
import {World} from '../World';
import {InterestRateModel} from '../Contract/InterestRateModel';
import {
  getAddressV
} from '../CoreValue';
import {
  AddressV,
  NumberV,
  Value} from '../Value';
import {Arg, Fetcher, getFetcherValue} from '../Command';
import {getInterestRateModel} from '../ContractLookup';

export async function getInterestRateModelAddress(world: World, interestRateModel: InterestRateModel): Promise<AddressV> {
  return new AddressV(interestRateModel._address);
}

export function interestRateModelFetchers() {
  return [
    new Fetcher<{interestRateModel: InterestRateModel}, AddressV>(`
        #### Address

        * "<InterestRateModel> Address" - Gets the address of the global price oracle
          * E.g. "InterestRateModel MyInterestRateModel Address"
      `,
      "Address",
      [
        new Arg("interestRateModel", getInterestRateModel)
      ],
      (world, {interestRateModel}) => getInterestRateModelAddress(world, interestRateModel),
      {namePos: 1}
    )
  ];
}

export async function getInterestRateModelValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("InterestRateModel", interestRateModelFetchers(), world, event);
}
