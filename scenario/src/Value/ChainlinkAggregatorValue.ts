import { Event } from "../Event";
import { World } from "../World";
import { getChainlinkAggregatorAddress, getWorldContractByAddress } from "../ContractLookup";
import { getAddressV, getCoreValue, mapValue } from "../CoreValue";
import { Arg, Fetcher, getFetcherValue } from "../Command";
import { AddressV, NumberV, Value, StringV } from "../Value";
import { ChainlinkAggregator } from "../Contract/ChainlinkAggregator";

export async function getChainlinkAggregatorDecimals(
  world: World,
  chainlinkAggregator: ChainlinkAggregator
): Promise<NumberV> {
  return new NumberV(await chainlinkAggregator.methods.decimals().call());
}

export async function getChainlinkAggregatorLatestAnswer(
  world: World,
  chainlinkAggregator: ChainlinkAggregator
): Promise<NumberV> {
  return new NumberV(await chainlinkAggregator.methods.latestAnswer().call());
}

export async function getChainlinkAggregatorV(
  world: World,
  event: Event
): Promise<ChainlinkAggregator> {
  const address = await mapValue<AddressV>(
    world,
    event,
    (str) => new AddressV(getChainlinkAggregatorAddress(world, str)),
    getCoreValue,
    AddressV
  );

  return getWorldContractByAddress<ChainlinkAggregator>(world, address.val);
}

export function chainlinkAggregatorFetchers() {
  return [
    new Fetcher<{ chainlinkAggregator: ChainlinkAggregator }, AddressV>(
      `
        #### Address

        * "ChainlinkAggregator <ChainlinkAggregatorName> Address" - Returns address of Chainlink Aggregator contract
          * E.g. "ChainlinkAggregator WBTCPoRFeed Address" - Returns WBTCPoRFeed address
      `,
      "Address",
      [new Arg("chainlinkAggregator", getChainlinkAggregatorV)],
      async (world, { chainlinkAggregator }) =>
        new AddressV(chainlinkAggregator._address),
      { namePos: 1 }
    ),
    new Fetcher<{ chainlinkAggregator: ChainlinkAggregator }, NumberV>(
      `
        #### Decimals

        * "ChainlinkAggregator <ChainlinkAggregatorName> Decimals" - Returns the decimal precision of the Chainlink Aggregator
          * E.g. "ChainlinkAggregator WBTCPoRFeed Decimals" - Returns WBTCPoRFeed decimals
      `,
      "Decimals",
      [new Arg("chainlinkAggregator", getChainlinkAggregatorV)],
      (world, { chainlinkAggregator }) =>
        getChainlinkAggregatorDecimals(world, chainlinkAggregator),
      { namePos: 1 }
    ),
    new Fetcher<{ chainlinkAggregator: ChainlinkAggregator }, NumberV>(
      `
        #### LatestAnswer

        * "ChainlinkAggregator <ChainlinkAggregatorName> LatestAnswer" - Returns the decimal precision of the Chainlink Aggregator
          * E.g. "ChainlinkAggregator WBTCPoRFeed LatestAnswer" - Returns WBTCPoRFeed's latest answer
      `,
      "LatestAnswer",
      [new Arg("chainlinkAggregator", getChainlinkAggregatorV)],
      (world, { chainlinkAggregator }) =>
        getChainlinkAggregatorLatestAnswer(world, chainlinkAggregator),
      { namePos: 1 }
    ),
  ];
}

export async function getChainlinkAggregatorValue(
  world: World,
  event: Event
): Promise<Value> {
  return await getFetcherValue<any, any>(
    "ChainlinkAggregator",
    chainlinkAggregatorFetchers(),
    world,
    event
  );
}
