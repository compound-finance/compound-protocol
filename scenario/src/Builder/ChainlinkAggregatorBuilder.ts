import { Event } from "../Event";
import { addAction, World } from "../World";
import { ChainlinkAggregator } from "../Contract/ChainlinkAggregator";
import { Invokation, invoke } from "../Invokation";
import {
  getAddressV,
  getCoreValue,
  getNumberV,
  getStringV,
} from "../CoreValue";
import { AddressV, NumberV, StringV, Value } from "../Value";
import { Arg, Fetcher, getFetcherValue } from "../Command";
import { storeAndSaveContract } from "../Networks";
import { getContract, getTestContract } from "../Contract";
import { encodeABI } from "../Utils";

const MockV3Aggregator = getTestContract("MockV3Aggregator");

export interface ChainlinkAggregatorV2V3Data {
  invokation: Invokation<ChainlinkAggregator>;
  description: string;
  name: string;
  decimals: number;
  address?: string;
  contract: string;
}

export async function buildChainlinkAggregator(
  world: World,
  from: string,
  event: Event
): Promise<{
  world: World;
  chainlinkAggregatorV2V3: ChainlinkAggregator;
  aggregatorData: ChainlinkAggregatorV2V3Data;
}> {
  const fetchers = [
    new Fetcher<
      { name: StringV; decimals: NumberV; initialAnswer: NumberV },
      ChainlinkAggregatorV2V3Data
    >(
      `
        #### MockV3Aggregator

        * "MockV3Aggregator name:<String> decimals:<number> initialAnswer:<number>" - Deploy a mock Chainlink V3 aggregator
          * E.g. "MockV3Aggregator WBTCPoRFeed 8 20632482989523"
      `,
      "MockV3Aggregator",
      [
        new Arg("name", getStringV),
        new Arg("decimals", getNumberV),
        new Arg("initialAnswer", getNumberV),
      ],
      async (world, { name, decimals, initialAnswer }) => {
        const aggregator = await MockV3Aggregator.deploy<ChainlinkAggregator>(
          world,
          from,
          [decimals.val, initialAnswer.val]
        );

        return {
          invokation: aggregator,
          description: "Deploy",
          decimals: decimals.toNumber(),
          name: name.val,
          contract: "MockV3Aggregator",
        };
      }
    ),
  ];

  let aggregatorData = await getFetcherValue<any, ChainlinkAggregatorV2V3Data>(
    "DeployChainlinkAggregator",
    fetchers,
    world,
    event
  );
  let invokation = aggregatorData.invokation;
  delete aggregatorData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }
  const chainlinkAggregatorV2V3 = invokation.value!;
  aggregatorData.address = chainlinkAggregatorV2V3._address;

  world = await storeAndSaveContract(
    world,
    chainlinkAggregatorV2V3,
    aggregatorData.name,
    invokation,
    [{ index: ["ChainlinkAggregators", aggregatorData.name], data: aggregatorData }]
  );

  return { world, chainlinkAggregatorV2V3, aggregatorData };
}
