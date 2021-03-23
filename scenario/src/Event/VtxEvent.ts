import { Event } from '../Event';
import { addAction, World, describeUser } from '../World';
import { Vtx, VtxScenario } from '../Contract/Vtx';
import { buildVtx } from '../Builder/VtxBuilder';
import { invoke } from '../Invokation';
import {
  getAddressV,
  getEventV,
  getNumberV,
  getStringV,
} from '../CoreValue';
import {
  AddressV,
  EventV,
  NumberV,
  StringV
} from '../Value';
import { Arg, Command, processCommandEvent, View } from '../Command';
import { getVtx } from '../ContractLookup';
import { NoErrorReporter } from '../ErrorReporter';
import { verify } from '../Verify';
import { encodedNumber } from '../Encoding';

async function genVtx(world: World, from: string, params: Event): Promise<World> {
  let { world: nextWorld, vtx, tokenData } = await buildVtx(world, from, params);
  world = nextWorld;

  world = addAction(
    world,
    `Deployed Vtx (${vtx.name}) to address ${vtx._address}`,
    tokenData.invokation
  );

  return world;
}

async function verifyVtx(world: World, vtx: Vtx, apiKey: string, modelName: string, contractName: string): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(`Politely declining to verify on local network: ${world.network}.`);
  } else {
    await verify(world, apiKey, modelName, contractName, vtx._address);
  }

  return world;
}

async function approve(world: World, from: string, vtx: Vtx, address: string, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, vtx.methods.approve(address, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `Approved Vtx token for ${from} of ${amount.show()}`,
    invokation
  );

  return world;
}

async function transfer(world: World, from: string, vtx: Vtx, address: string, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, vtx.methods.transfer(address, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `Transferred ${amount.show()} Vtx tokens from ${from} to ${address}`,
    invokation
  );

  return world;
}

async function transferFrom(world: World, from: string, vtx: Vtx, owner: string, spender: string, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, vtx.methods.transferFrom(owner, spender, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `"Transferred from" ${amount.show()} Vtx tokens from ${owner} to ${spender}`,
    invokation
  );

  return world;
}

async function transferScenario(world: World, from: string, vtx: VtxScenario, addresses: string[], amount: NumberV): Promise<World> {
  let invokation = await invoke(world, vtx.methods.transferScenario(addresses, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `Transferred ${amount.show()} Vtx tokens from ${from} to ${addresses}`,
    invokation
  );

  return world;
}

async function transferFromScenario(world: World, from: string, vtx: VtxScenario, addresses: string[], amount: NumberV): Promise<World> {
  let invokation = await invoke(world, vtx.methods.transferFromScenario(addresses, amount.encode()), from, NoErrorReporter);

  world = addAction(
    world,
    `Transferred ${amount.show()} Vtx tokens from ${addresses} to ${from}`,
    invokation
  );

  return world;
}

async function delegate(world: World, from: string, vtx: Vtx, account: string): Promise<World> {
  let invokation = await invoke(world, vtx.methods.delegate(account), from, NoErrorReporter);

  world = addAction(
    world,
    `"Delegated from" ${from} to ${account}`,
    invokation
  );

  return world;
}

async function setBlockNumber(
  world: World,
  from: string,
  vtx: Vtx,
  blockNumber: NumberV
): Promise<World> {
  return addAction(
    world,
    `Set Vtx blockNumber to ${blockNumber.show()}`,
    await invoke(world, vtx.methods.setBlockNumber(blockNumber.encode()), from)
  );
}

export function vtxCommands() {
  return [
    new Command<{ params: EventV }>(`
        #### Deploy

        * "Deploy ...params" - Generates a new Vtx token
          * E.g. "Vtx Deploy"
      `,
      "Deploy",
      [
        new Arg("params", getEventV, { variadic: true })
      ],
      (world, from, { params }) => genVtx(world, from, params.val)
    ),

    new View<{ vtx: Vtx, apiKey: StringV, contractName: StringV }>(`
        #### Verify

        * "<Vtx> Verify apiKey:<String> contractName:<String>=Vtx" - Verifies Vtx token in Etherscan
          * E.g. "Vtx Verify "myApiKey"
      `,
      "Verify",
      [
        new Arg("vtx", getVtx, { implicit: true }),
        new Arg("apiKey", getStringV),
        new Arg("contractName", getStringV, { default: new StringV("Vtx") })
      ],
      async (world, { vtx, apiKey, contractName }) => {
        return await verifyVtx(world, vtx, apiKey.val, vtx.name, contractName.val)
      }
    ),

    new Command<{ vtx: Vtx, spender: AddressV, amount: NumberV }>(`
        #### Approve

        * "Vtx Approve spender:<Address> <Amount>" - Adds an allowance between user and address
          * E.g. "Vtx Approve Geoff 1.0e18"
      `,
      "Approve",
      [
        new Arg("vtx", getVtx, { implicit: true }),
        new Arg("spender", getAddressV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { vtx, spender, amount }) => {
        return approve(world, from, vtx, spender.val, amount)
      }
    ),

    new Command<{ vtx: Vtx, recipient: AddressV, amount: NumberV }>(`
        #### Transfer

        * "Vtx Transfer recipient:<User> <Amount>" - Transfers a number of tokens via "transfer" as given user to recipient (this does not depend on allowance)
          * E.g. "Vtx Transfer Torrey 1.0e18"
      `,
      "Transfer",
      [
        new Arg("vtx", getVtx, { implicit: true }),
        new Arg("recipient", getAddressV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { vtx, recipient, amount }) => transfer(world, from, vtx, recipient.val, amount)
    ),

    new Command<{ vtx: Vtx, owner: AddressV, spender: AddressV, amount: NumberV }>(`
        #### TransferFrom

        * "Vtx TransferFrom owner:<User> spender:<User> <Amount>" - Transfers a number of tokens via "transfeFrom" to recipient (this depends on allowances)
          * E.g. "Vtx TransferFrom Geoff Torrey 1.0e18"
      `,
      "TransferFrom",
      [
        new Arg("vtx", getVtx, { implicit: true }),
        new Arg("owner", getAddressV),
        new Arg("spender", getAddressV),
        new Arg("amount", getNumberV)
      ],
      (world, from, { vtx, owner, spender, amount }) => transferFrom(world, from, vtx, owner.val, spender.val, amount)
    ),

    new Command<{ vtx: VtxScenario, recipients: AddressV[], amount: NumberV }>(`
        #### TransferScenario

        * "Vtx TransferScenario recipients:<User[]> <Amount>" - Transfers a number of tokens via "transfer" to the given recipients (this does not depend on allowance)
          * E.g. "Vtx TransferScenario (Jared Torrey) 10"
      `,
      "TransferScenario",
      [
        new Arg("vtx", getVtx, { implicit: true }),
        new Arg("recipients", getAddressV, { mapped: true }),
        new Arg("amount", getNumberV)
      ],
      (world, from, { vtx, recipients, amount }) => transferScenario(world, from, vtx, recipients.map(recipient => recipient.val), amount)
    ),

    new Command<{ vtx: VtxScenario, froms: AddressV[], amount: NumberV }>(`
        #### TransferFromScenario

        * "Vtx TransferFromScenario froms:<User[]> <Amount>" - Transfers a number of tokens via "transferFrom" from the given users to msg.sender (this depends on allowance)
          * E.g. "Vtx TransferFromScenario (Jared Torrey) 10"
      `,
      "TransferFromScenario",
      [
        new Arg("vtx", getVtx, { implicit: true }),
        new Arg("froms", getAddressV, { mapped: true }),
        new Arg("amount", getNumberV)
      ],
      (world, from, { vtx, froms, amount }) => transferFromScenario(world, from, vtx, froms.map(_from => _from.val), amount)
    ),

    new Command<{ vtx: Vtx, account: AddressV }>(`
        #### Delegate

        * "Vtx Delegate account:<Address>" - Delegates votes to a given account
          * E.g. "Vtx Delegate Torrey"
      `,
      "Delegate",
      [
        new Arg("vtx", getVtx, { implicit: true }),
        new Arg("account", getAddressV),
      ],
      (world, from, { vtx, account }) => delegate(world, from, vtx, account.val)
    ),
    new Command<{ vtx: Vtx, blockNumber: NumberV }>(`
      #### SetBlockNumber

      * "SetBlockNumber <Seconds>" - Sets the blockTimestamp of the Vtx Harness
      * E.g. "Vtx SetBlockNumber 500"
      `,
        'SetBlockNumber',
        [new Arg('vtx', getVtx, { implicit: true }), new Arg('blockNumber', getNumberV)],
        (world, from, { vtx, blockNumber }) => setBlockNumber(world, from, vtx, blockNumber)
      )
  ];
}

export async function processVtxEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("Vtx", vtxCommands(), world, event, from);
}
