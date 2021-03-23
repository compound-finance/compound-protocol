import { Event } from '../Event';
import { addAction, describeUser, World } from '../World';
import { ControllerImpl } from '../Contract/ControllerImpl';
import { Unitroller } from '../Contract/Unitroller';
import { invoke } from '../Invokation';
import { getAddressV, getArrayV, getEventV, getExpNumberV, getNumberV, getStringV, getCoreValue } from '../CoreValue';
import { ArrayV, AddressV, EventV, NumberV, StringV } from '../Value';
import { Arg, Command, View, processCommandEvent } from '../Command';
import { buildControllerImpl } from '../Builder/ControllerImplBuilder';
import { ControllerErrorReporter } from '../ErrorReporter';
import { getControllerImpl, getControllerImplData, getUnitroller } from '../ContractLookup';
import { verify } from '../Verify';
import { mergeContractABI } from '../Networks';
import { encodedNumber } from '../Encoding';
import { encodeABI } from '../Utils';

async function genControllerImpl(world: World, from: string, params: Event): Promise<World> {
  let { world: nextWorld, controllerImpl, controllerImplData } = await buildControllerImpl(
    world,
    from,
    params
  );
  world = nextWorld;

  world = addAction(
    world,
    `Added Controller Implementation (${controllerImplData.description}) at address ${controllerImpl._address}`,
    controllerImplData.invokation
  );

  return world;
}

async function mergeABI(
  world: World,
  from: string,
  controllerImpl: ControllerImpl,
  unitroller: Unitroller
): Promise<World> {
  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'Controller', unitroller, unitroller.name, controllerImpl.name);
  }

  return world;
}

async function becomeG1(
  world: World,
  from: string,
  controllerImpl: ControllerImpl,
  unitroller: Unitroller,
  priceOracleAddr: string,
  closeFactor: encodedNumber,
  maxAssets: encodedNumber
): Promise<World> {
  let invokation = await invoke(
    world,
    controllerImpl.methods._become(unitroller._address, priceOracleAddr, closeFactor, maxAssets, false),
    from,
    ControllerErrorReporter
  );
  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'Controller', unitroller, unitroller.name, controllerImpl.name);
  }

  world = addAction(
    world,
    `Become ${unitroller._address}'s Controller Impl with priceOracle=${priceOracleAddr},closeFactor=${closeFactor},maxAssets=${maxAssets}`,
    invokation
  );

  return world;
}

// Recome calls `become` on the G1 Controller, but passes a flag to not modify any of the initialization variables.
async function recome(
  world: World,
  from: string,
  controllerImpl: ControllerImpl,
  unitroller: Unitroller
): Promise<World> {
  let invokation = await invoke(
    world,
    controllerImpl.methods._become(
      unitroller._address,
      '0x0000000000000000000000000000000000000000',
      0,
      0,
      true
    ),
    from,
    ControllerErrorReporter
  );

  world = await mergeContractABI(world, 'Controller', unitroller, unitroller.name, controllerImpl.name);

  world = addAction(world, `Recome ${unitroller._address}'s Controller Impl`, invokation);

  return world;
}

async function becomeG2(
  world: World,
  from: string,
  controllerImpl: ControllerImpl,
  unitroller: Unitroller
): Promise<World> {
  let invokation = await invoke(
    world,
    controllerImpl.methods._become(unitroller._address),
    from,
    ControllerErrorReporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'Controller', unitroller, unitroller.name, controllerImpl.name);
  }

  world = addAction(world, `Become ${unitroller._address}'s Controller Impl`, invokation);

  return world;
}

async function becomeG3(
  world: World,
  from: string,
  controllerImpl: ControllerImpl,
  unitroller: Unitroller,
  vtxRate: encodedNumber,
  vtxMarkets: string[],
  otherMarkets: string[]
): Promise<World> {
  let invokation = await invoke(
    world,
    controllerImpl.methods._become(unitroller._address, vtxRate, vtxMarkets, otherMarkets),
    from,
    ControllerErrorReporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'Controller', unitroller, unitroller.name, controllerImpl.name);
  }

  world = addAction(world, `Become ${unitroller._address}'s Controller Impl`, invokation);

  return world;
}

async function becomeG4(
  world: World,
  from: string,
  controllerImpl: ControllerImpl,
  unitroller: Unitroller
): Promise<World> {
  let invokation = await invoke(
    world,
    controllerImpl.methods._become(unitroller._address),
    from,
    ControllerErrorReporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'Controller', unitroller, unitroller.name, controllerImpl.name);
  }

  world = addAction(world, `Become ${unitroller._address}'s Controller Impl`, invokation);

  return world;
}

async function becomeG5(
  world: World,
  from: string,
  controllerImpl: ControllerImpl,
  unitroller: Unitroller
): Promise<World> {
  let invokation = await invoke(
    world,
    controllerImpl.methods._become(unitroller._address),
    from,
    ControllerErrorReporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'Controller', unitroller, unitroller.name, controllerImpl.name);
  }

  world = addAction(world, `Become ${unitroller._address}'s Controller Impl`, invokation);

  return world;
}

async function becomeG6(
  world: World,
  from: string,
  controllerImpl: ControllerImpl,
  unitroller: Unitroller
): Promise<World> {
  let invokation = await invoke(
    world,
    controllerImpl.methods._become(unitroller._address),
    from,
    ControllerErrorReporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'Controller', unitroller, unitroller.name, controllerImpl.name);
  }

  world = addAction(world, `Become ${unitroller._address}'s Controller Impl`, invokation);

  return world;
}

async function become(
  world: World,
  from: string,
  controllerImpl: ControllerImpl,
  unitroller: Unitroller
): Promise<World> {
  let invokation = await invoke(
    world,
    controllerImpl.methods._become(unitroller._address),
    from,
    ControllerErrorReporter
  );

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'Controller', unitroller, unitroller.name, controllerImpl.name);
  }

  world = addAction(world, `Become ${unitroller._address}'s Controller Impl`, invokation);

  return world;
}

async function verifyControllerImpl(
  world: World,
  controllerImpl: ControllerImpl,
  name: string,
  contract: string,
  apiKey: string
): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(`Politely declining to verify on local network: ${world.network}.`);
  } else {
    await verify(world, apiKey, name, contract, controllerImpl._address);
  }

  return world;
}

export function controllerImplCommands() {
  return [
    new Command<{ controllerImplParams: EventV }>(
      `
        #### Deploy

        * "ControllerImpl Deploy ...controllerImplParams" - Generates a new Controller Implementation
          * E.g. "ControllerImpl Deploy MyScen Scenario"
      `,
      'Deploy',
      [new Arg('controllerImplParams', getEventV, { variadic: true })],
      (world, from, { controllerImplParams }) => genControllerImpl(world, from, controllerImplParams.val)
    ),
    new View<{ controllerImplArg: StringV; apiKey: StringV }>(
      `
        #### Verify

        * "ControllerImpl <Impl> Verify apiKey:<String>" - Verifies Controller Implemetation in Etherscan
          * E.g. "ControllerImpl Verify "myApiKey"
      `,
      'Verify',
      [new Arg('controllerImplArg', getStringV), new Arg('apiKey', getStringV)],
      async (world, { controllerImplArg, apiKey }) => {
        let [controllerImpl, name, data] = await getControllerImplData(world, controllerImplArg.val);

        return await verifyControllerImpl(world, controllerImpl, name, data.get('contract')!, apiKey.val);
      },
      { namePos: 1 }
    ),
    new Command<{
      unitroller: Unitroller;
      controllerImpl: ControllerImpl;
      priceOracle: AddressV;
      closeFactor: NumberV;
      maxAssets: NumberV;
    }>(
      `
        #### BecomeG1

        * "ControllerImpl <Impl> BecomeG1 priceOracle:<Number> closeFactor:<Exp> maxAssets:<Number>" - Become the controller, if possible.
          * E.g. "ControllerImpl MyImpl BecomeG1
      `,
      'BecomeG1',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('controllerImpl', getControllerImpl),
        new Arg('priceOracle', getAddressV),
        new Arg('closeFactor', getExpNumberV),
        new Arg('maxAssets', getNumberV)
      ],
      (world, from, { unitroller, controllerImpl, priceOracle, closeFactor, maxAssets }) =>
        becomeG1(
          world,
          from,
          controllerImpl,
          unitroller,
          priceOracle.val,
          closeFactor.encode(),
          maxAssets.encode()
        ),
      { namePos: 1 }
    ),

    new Command<{
      unitroller: Unitroller;
      controllerImpl: ControllerImpl;
    }>(
      `
        #### BecomeG2

        * "ControllerImpl <Impl> BecomeG2" - Become the controller, if possible.
          * E.g. "ControllerImpl MyImpl BecomeG2
      `,
      'BecomeG2',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('controllerImpl', getControllerImpl)
      ],
      (world, from, { unitroller, controllerImpl }) => becomeG2(world, from, controllerImpl, unitroller),
      { namePos: 1 }
    ),

    new Command<{
      unitroller: Unitroller;
      controllerImpl: ControllerImpl;
      vtxRate: NumberV;
      vtxMarkets: ArrayV<AddressV>;
      otherMarkets: ArrayV<AddressV>;
    }>(
      `
        #### BecomeG3

        * "ControllerImpl <Impl> BecomeG3 <Rate> <VtxMarkets> <OtherMarkets>" - Become the controller, if possible.
          * E.g. "ControllerImpl MyImpl BecomeG3 0.1e18 [vDAI, vETH, cUSDC]
      `,
      'BecomeG3',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('controllerImpl', getControllerImpl),
        new Arg('vtxRate', getNumberV, { default: new NumberV(1e18) }),
        new Arg('vtxMarkets', getArrayV(getAddressV),  {default: new ArrayV([]) }),
        new Arg('otherMarkets', getArrayV(getAddressV), { default: new ArrayV([]) })
      ],
      (world, from, { unitroller, controllerImpl, vtxRate, vtxMarkets, otherMarkets }) => {
        return becomeG3(world, from, controllerImpl, unitroller, vtxRate.encode(), vtxMarkets.val.map(a => a.val), otherMarkets.val.map(a => a.val))
      },
      { namePos: 1 }
    ),
  
    new Command<{
      unitroller: Unitroller;
      controllerImpl: ControllerImpl;
    }>(
      `
        #### BecomeG4
        * "ControllerImpl <Impl> BecomeG4" - Become the controller, if possible.
          * E.g. "ControllerImpl MyImpl BecomeG4
      `,
      'BecomeG4',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('controllerImpl', getControllerImpl)
      ],
      (world, from, { unitroller, controllerImpl }) => {
        return becomeG4(world, from, controllerImpl, unitroller)
      },
      { namePos: 1 }
    ),

    new Command<{
      unitroller: Unitroller;
      controllerImpl: ControllerImpl;
    }>(
      `
        #### BecomeG5
        * "ControllerImpl <Impl> BecomeG5" - Become the controller, if possible.
          * E.g. "ControllerImpl MyImpl BecomeG5
      `,
      'BecomeG5',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('controllerImpl', getControllerImpl)
      ],
      (world, from, { unitroller, controllerImpl }) => {
        return becomeG5(world, from, controllerImpl, unitroller)
      },
      { namePos: 1 }
    ),

    new Command<{
      unitroller: Unitroller;
      controllerImpl: ControllerImpl;
    }>(
      `
        #### BecomeG6
        * "ControllerImpl <Impl> BecomeG6" - Become the controller, if possible.
          * E.g. "ControllerImpl MyImpl BecomeG6
      `,
      'BecomeG6',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('controllerImpl', getControllerImpl)
      ],
      (world, from, { unitroller, controllerImpl }) => {
        return becomeG6(world, from, controllerImpl, unitroller)
      },
      { namePos: 1 }
    ),

    new Command<{
      unitroller: Unitroller;
      controllerImpl: ControllerImpl;
    }>(
      `
        #### Become

        * "ControllerImpl <Impl> Become <Rate> <VtxMarkets> <OtherMarkets>" - Become the controller, if possible.
          * E.g. "ControllerImpl MyImpl Become 0.1e18 [vDAI, vETH, cUSDC]
      `,
      'Become',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('controllerImpl', getControllerImpl)
      ],
      (world, from, { unitroller, controllerImpl }) => {
        return become(world, from, controllerImpl, unitroller)
      },
      { namePos: 1 }
    ),

    new Command<{
      unitroller: Unitroller;
      controllerImpl: ControllerImpl;
    }>(
      `
        #### MergeABI

        * "ControllerImpl <Impl> MergeABI" - Merges the ABI, as if it was a become.
          * E.g. "ControllerImpl MyImpl MergeABI
      `,
      'MergeABI',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('controllerImpl', getControllerImpl)
      ],
      (world, from, { unitroller, controllerImpl }) => mergeABI(world, from, controllerImpl, unitroller),
      { namePos: 1 }
    ),
    new Command<{ unitroller: Unitroller; controllerImpl: ControllerImpl }>(
      `
        #### Recome

        * "ControllerImpl <Impl> Recome" - Recome the controller
          * E.g. "ControllerImpl MyImpl Recome
      `,
      'Recome',
      [
        new Arg('unitroller', getUnitroller, { implicit: true }),
        new Arg('controllerImpl', getControllerImpl)
      ],
      (world, from, { unitroller, controllerImpl }) => recome(world, from, controllerImpl, unitroller),
      { namePos: 1 }
    )
  ];
}

export async function processControllerImplEvent(
  world: World,
  event: Event,
  from: string | null
): Promise<World> {
  return await processCommandEvent<any>('ControllerImpl', controllerImplCommands(), world, event, from);
}
