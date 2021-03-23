import { Event } from '../Event';
import { addAction, describeUser, World } from '../World';
import { decodeCall, getPastEvents } from '../Contract';
import { VToken, VTokenScenario } from '../Contract/VToken';
import { VErc20Delegate } from '../Contract/VErc20Delegate'
import { invoke, Sendable } from '../Invokation';
import {
  getAddressV,
  getEventV,
  getExpNumberV,
  getNumberV,
  getStringV,
  getBoolV
} from '../CoreValue';
import {
  AddressV,
  BoolV,
  EventV,
  NothingV,
  NumberV,
  StringV
} from '../Value';
import { Arg, Command, View, processCommandEvent } from '../Command';
import { getVTokenDelegateData } from '../ContractLookup';
import { buildVTokenDelegate } from '../Builder/VTokenDelegateBuilder';
import { verify } from '../Verify';

async function genVTokenDelegate(world: World, from: string, event: Event): Promise<World> {
  let { world: nextWorld, vTokenDelegate, delegateData } = await buildVTokenDelegate(world, from, event);
  world = nextWorld;

  world = addAction(
    world,
    `Added vToken ${delegateData.name} (${delegateData.contract}) at address ${vTokenDelegate._address}`,
    delegateData.invokation
  );

  return world;
}

async function verifyVTokenDelegate(world: World, vTokenDelegate: VErc20Delegate, name: string, contract: string, apiKey: string): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(`Politely declining to verify on local network: ${world.network}.`);
  } else {
    await verify(world, apiKey, name, contract, vTokenDelegate._address);
  }

  return world;
}

export function vTokenDelegateCommands() {
  return [
    new Command<{ vTokenDelegateParams: EventV }>(`
        #### Deploy

        * "VTokenDelegate Deploy ...vTokenDelegateParams" - Generates a new VTokenDelegate
          * E.g. "VTokenDelegate Deploy VDaiDelegate vDAIDelegate"
      `,
      "Deploy",
      [new Arg("vTokenDelegateParams", getEventV, { variadic: true })],
      (world, from, { vTokenDelegateParams }) => genVTokenDelegate(world, from, vTokenDelegateParams.val)
    ),
    new View<{ vTokenDelegateArg: StringV, apiKey: StringV }>(`
        #### Verify

        * "VTokenDelegate <vTokenDelegate> Verify apiKey:<String>" - Verifies VTokenDelegate in Etherscan
          * E.g. "VTokenDelegate vDaiDelegate Verify "myApiKey"
      `,
      "Verify",
      [
        new Arg("vTokenDelegateArg", getStringV),
        new Arg("apiKey", getStringV)
      ],
      async (world, { vTokenDelegateArg, apiKey }) => {
        let [vToken, name, data] = await getVTokenDelegateData(world, vTokenDelegateArg.val);

        return await verifyVTokenDelegate(world, vToken, name, data.get('contract')!, apiKey.val);
      },
      { namePos: 1 }
    ),
  ];
}

export async function processVTokenDelegateEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("VTokenDelegate", vTokenDelegateCommands(), world, event, from);
}
