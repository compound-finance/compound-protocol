import { Event } from "../Event";
import { addAction, describeUser, World } from "../World";
import { decodeCall, getPastEvents } from "../Contract";
import { XToken, XTokenScenario } from "../Contract/XToken";
import { XErc20Delegate } from "../Contract/XErc20Delegate";
import { invoke, Sendable } from "../Invokation";
import {
  getAddressV,
  getEventV,
  getExpNumberV,
  getNumberV,
  getStringV,
  getBoolV,
} from "../CoreValue";
import { AddressV, BoolV, EventV, NothingV, NumberV, StringV } from "../Value";
import { Arg, Command, View, processCommandEvent } from "../Command";
import { getXTokenDelegateData } from "../ContractLookup";
import { buildXTokenDelegate } from "../Builder/XTokenDelegateBuilder";
import { verify } from "../Verify";

async function genXTokenDelegate(
  world: World,
  from: string,
  event: Event
): Promise<World> {
  let {
    world: nextWorld,
    cTokenDelegate,
    delegateData,
  } = await buildXTokenDelegate(world, from, event);
  world = nextWorld;

  world = addAction(
    world,
    `Added cToken ${delegateData.name} (${delegateData.contract}) at address ${cTokenDelegate._address}`,
    delegateData.invokation
  );

  return world;
}

async function verifyXTokenDelegate(
  world: World,
  cTokenDelegate: XErc20Delegate,
  name: string,
  contract: string,
  apiKey: string
): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(
      `Politely declining to verify on local network: ${world.network}.`
    );
  } else {
    await verify(world, apiKey, name, contract, cTokenDelegate._address);
  }

  return world;
}

export function cTokenDelegateCommands() {
  return [
    new Command<{ cTokenDelegateParams: EventV }>(
      `
        #### Deploy

        * "XTokenDelegate Deploy ...cTokenDelegateParams" - Generates a new XTokenDelegate
          * E.g. "XTokenDelegate Deploy CDaiDelegate cDAIDelegate"
      `,
      "Deploy",
      [new Arg("cTokenDelegateParams", getEventV, { variadic: true })],
      (world, from, { cTokenDelegateParams }) =>
        genXTokenDelegate(world, from, cTokenDelegateParams.val)
    ),
    new View<{ cTokenDelegateArg: StringV; apiKey: StringV }>(
      `
        #### Verify

        * "XTokenDelegate <cTokenDelegate> Verify apiKey:<String>" - Verifies XTokenDelegate in Etherscan
          * E.g. "XTokenDelegate cDaiDelegate Verify "myApiKey"
      `,
      "Verify",
      [new Arg("cTokenDelegateArg", getStringV), new Arg("apiKey", getStringV)],
      async (world, { cTokenDelegateArg, apiKey }) => {
        let [cToken, name, data] = await getXTokenDelegateData(
          world,
          cTokenDelegateArg.val
        );

        return await verifyXTokenDelegate(
          world,
          cToken,
          name,
          data.get("contract")!,
          apiKey.val
        );
      },
      { namePos: 1 }
    ),
  ];
}

export async function processXTokenDelegateEvent(
  world: World,
  event: Event,
  from: string | null
): Promise<World> {
  return await processCommandEvent<any>(
    "XTokenDelegate",
    cTokenDelegateCommands(),
    world,
    event,
    from
  );
}
