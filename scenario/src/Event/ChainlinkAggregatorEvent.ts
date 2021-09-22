import { Event } from "../Event";
import { addAction, World } from "../World";
import { Erc20 } from "../Contract/Erc20";
import { invoke } from "../Invokation";
import { buildChainlinkAggregator } from "../Builder/ChainlinkAggregatorBuilder";
import {
  getAddressV,
  getBoolV,
  getEventV,
  getNumberV,
  getStringV,
} from "../CoreValue";
import { AddressV, BoolV, EventV, NumberV, StringV } from "../Value";
import { getErc20V } from "../Value/Erc20Value";
import { verify } from "../Verify";
import { Arg, Command, View, processCommandEvent } from "../Command";
import { NoErrorReporter } from "../ErrorReporter";
import { encodedNumber } from "../Encoding";
import { ChainlinkAggregator } from "../Contract/ChainlinkAggregator";
import { getChainlinkAggregatorV } from "../Value/ChainlinkAggregatorValue";

async function genChainlinkAggregator(
  world: World,
  from: string,
  params: Event
): Promise<World> {
  let {
    world: newWorld,
    chainlinkAggregatorV2V3,
    aggregatorData,
  } = await buildChainlinkAggregator(world, from, params);
  world = newWorld;

  world = addAction(
    world,
    `Added ChainlinkAggregator ${aggregatorData.name} (${aggregatorData.description}) at address ${chainlinkAggregatorV2V3._address}`,
    aggregatorData.invokation
  );

  return world;
}

async function mockV3AggregatorUpdateAnswer(
  world: World,
  from: string,
  aggregator: ChainlinkAggregator,
  newAnswer: NumberV
): Promise<World> {
  let invokation = await invoke(
    world,
    aggregator.methods.updateAnswer(newAnswer.encode()),
    from,
    NoErrorReporter
  );

  world = addAction(
    world,
    `Updated MockV3Aggregator's latest answer to ${newAnswer.show()}`,
    invokation
  );

  return world;
}

export function chainlinkAggregatorCommands() {
  return [
    new Command<{ chainlinkAggregatorParams: EventV }>(
      `
        #### Deploy

        * "Deploy ..." - Deploy a Chainlink V3 aggregator
          * E.g. "ChainlinkAggregator Deploy MockV3Aggregator WBTCPoRFeed 8 20632482989523"
      `,
      "Deploy",
      [new Arg("chainlinkAggregatorParams", getEventV, { variadic: true })],
      (world, from, { chainlinkAggregatorParams }) =>
        genChainlinkAggregator(world, from, chainlinkAggregatorParams.val)
    ),
    new Command<{ aggregator: ChainlinkAggregator; newAnswer: NumberV }>(
      `
        #### UpdateAnswer

        * "UpdateAnswer ..." - Update a Chainlink V3 aggregator's answer
          * E.g. "ChainlinkAggregator WBTCPoRFeed UpdateAnswer 20632482989523"
      `,
      "UpdateAnswer",
      [
        new Arg("aggregator", getChainlinkAggregatorV),
        new Arg("newAnswer", getNumberV),
      ],
      (world, from, { aggregator, newAnswer }) =>
        mockV3AggregatorUpdateAnswer(world, from, aggregator, newAnswer),
      { namePos: 1 }
    ),
  ];
}

export async function processChainlinkAggregatorEvent(
  world: World,
  event: Event,
  from: string | null
): Promise<World> {
  return await processCommandEvent<any>(
    "ChainlinkAggregator",
    chainlinkAggregatorCommands(),
    world,
    event,
    from
  );
}
