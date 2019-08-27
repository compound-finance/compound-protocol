import {Event} from '../Event';
import {addAction, describeUser, World} from '../World';
import {ComptrollerImpl} from '../Contract/ComptrollerImpl';
import {Unitroller} from '../Contract/Unitroller';
import {invoke} from '../Invokation';
import {
  getAddressV,
  getEventV,
  getExpNumberV,
  getNumberV,
  getStringV
} from '../CoreValue';
import {
  AddressV,
  EventV,
  NumberV,
  StringV
} from '../Value';
import {Arg, Command, View, processCommandEvent} from '../Command';
import {buildComptrollerImpl} from '../Builder/ComptrollerImplBuilder';
import {ComptrollerErrorReporter} from '../ErrorReporter';
import {getComptrollerImpl, getComptrollerImplData, getUnitroller} from '../ContractLookup';
import {verify} from '../Verify';
import {mergeContractABI} from '../Networks';
import {encodedNumber} from '../Encoding';

async function genComptrollerImpl(world: World, from: string, params: Event): Promise<World> {
  let {world: nextWorld, comptrollerImpl, comptrollerImplData} = await buildComptrollerImpl(world, from, params);
  world = nextWorld;

  world = addAction(
    world,
    `Added Comptroller Implementation (${comptrollerImplData.description}) at address ${comptrollerImpl._address}`,
    comptrollerImplData.invokation
  );

  return world;
};

async function become(world: World, from: string, comptrollerImpl: ComptrollerImpl, unitroller: Unitroller, priceOracleAddr: string, closeFactor: encodedNumber, maxAssets: encodedNumber): Promise<World> {
  let invokation = await invoke(world, comptrollerImpl.methods._become(unitroller._address, priceOracleAddr, closeFactor, maxAssets, false), from, ComptrollerErrorReporter);

  if (!world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world = await mergeContractABI(world, 'Comptroller', unitroller, unitroller.name, comptrollerImpl.name);
  }

  world = addAction(
    world,
    `Become ${unitroller._address}'s Comptroller Impl with priceOracle=${priceOracleAddr},closeFactor=${closeFactor},maxAssets=${maxAssets}`,
    invokation
  );

  return world;
}

async function recome(world: World, from: string, comptrollerImpl: ComptrollerImpl, unitroller: Unitroller): Promise<World> {
  let invokation = await invoke(world, comptrollerImpl.methods._become(unitroller._address, "0x0000000000000000000000000000000000000000", 0, 0, true), from, ComptrollerErrorReporter);

  world = await mergeContractABI(world, 'Comptroller', unitroller, unitroller.name, comptrollerImpl.name);

  world = addAction(
    world,
    `Recome ${unitroller._address}'s Comptroller Impl`,
    invokation
  );

  return world;
}

async function verifyComptrollerImpl(world: World, comptrollerImpl: ComptrollerImpl, name: string, contract: string, apiKey: string): Promise<World> {
  if (world.isLocalNetwork()) {
    world.printer.printLine(`Politely declining to verify on local network: ${world.network}.`);
  } else {
    await verify(world, apiKey, name, contract, comptrollerImpl._address);
  }

  return world;
}

export function comptrollerImplCommands() {
  return [
    new Command<{comptrollerImplParams: EventV}>(`
        #### Deploy

        * "ComptrollerImpl Deploy ...comptrollerImplParams" - Generates a new Comptroller Implementation
          * E.g. "ComptrollerImpl Deploy MyScen Scenario"
      `,
      "Deploy",
      [new Arg("comptrollerImplParams", getEventV, {variadic: true})],
      (world, from, {comptrollerImplParams}) => genComptrollerImpl(world, from, comptrollerImplParams.val)
    ),
    new View<{comptrollerImplArg: StringV, apiKey: StringV}>(`
        #### Verify

        * "ComptrollerImpl <Impl> Verify apiKey:<String>" - Verifies Comptroller Implemetation in Etherscan
          * E.g. "ComptrollerImpl Verify "myApiKey"
      `,
      "Verify",
      [
        new Arg("comptrollerImplArg", getStringV),
        new Arg("apiKey", getStringV)
      ],
      async (world, {comptrollerImplArg, apiKey}) => {
        let [comptrollerImpl, name, data] = await getComptrollerImplData(world, comptrollerImplArg.val);

        return await verifyComptrollerImpl(world, comptrollerImpl, name, data.get('contract')!, apiKey.val);
      },
      {namePos: 1}
    ),
    new Command<{unitroller: Unitroller, comptrollerImpl: ComptrollerImpl, priceOracle: AddressV, closeFactor: NumberV, maxAssets: NumberV}>(`
        #### Become

        * "ComptrollerImpl <Impl> Become priceOracle:<Number> closeFactor:<Exp> maxAssets:<Number>" - Become the comptroller, if possible.
          * E.g. "ComptrollerImpl MyImpl Become
      `,
      "Become",
      [
        new Arg("unitroller", getUnitroller, {implicit: true}),
        new Arg("comptrollerImpl", getComptrollerImpl),
        new Arg("priceOracle", getAddressV),
        new Arg("closeFactor", getExpNumberV),
        new Arg("maxAssets", getNumberV)
      ],
      (world, from, {unitroller, comptrollerImpl, priceOracle, closeFactor, maxAssets}) => become(world, from, comptrollerImpl, unitroller, priceOracle.val, closeFactor.encode(), maxAssets.encode()),
      {namePos: 1}
    ),
    new Command<{unitroller: Unitroller, comptrollerImpl: ComptrollerImpl}>(`
        #### Recome

        * "ComptrollerImpl <Impl> Recome" - Recome the comptroller
          * E.g. "ComptrollerImpl MyImpl Recome
      `,
      "Recome",
      [
        new Arg("unitroller", getUnitroller, {implicit: true}),
        new Arg("comptrollerImpl", getComptrollerImpl)
      ],
      (world, from, {unitroller, comptrollerImpl}) => recome(world, from, comptrollerImpl, unitroller),
      {namePos: 1}
    )
  ];
}

export async function processComptrollerImplEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("ComptrollerImpl", comptrollerImplCommands(), world, event, from);
}
