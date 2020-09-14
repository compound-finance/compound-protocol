import { Event } from '../Event';
import { addAction, World } from '../World';
import { ComptrollerImpl } from '../Contract/ComptrollerImpl';
import { Invokation, invoke } from '../Invokation';
import { getAddressV, getExpNumberV, getNumberV, getStringV } from '../CoreValue';
import { AddressV, NumberV, StringV } from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { storeAndSaveContract } from '../Networks';
import { getContract, getTestContract } from '../Contract';

const ComptrollerG1Contract = getContract('ComptrollerG1');
const ComptrollerScenarioG1Contract = getTestContract('ComptrollerScenarioG1');

const ComptrollerG2Contract = getContract('ComptrollerG2');
const ComptrollerScenarioG2Contract = getContract('ComptrollerScenarioG2');

const ComptrollerG3Contract = getContract('ComptrollerG3');
const ComptrollerScenarioG3Contract = getContract('ComptrollerScenarioG3');

const ComptrollerG4Contract = getContract('ComptrollerG4');
const ComptrollerScenarioG4Contract = getContract('ComptrollerScenarioG4');

const ComptrollerScenarioContract = getTestContract('ComptrollerScenario');
const ComptrollerContract = getContract('Comptroller');

const ComptrollerBorkedContract = getTestContract('ComptrollerBorked');

export interface ComptrollerImplData {
  invokation: Invokation<ComptrollerImpl>;
  name: string;
  contract: string;
  description: string;
}

export async function buildComptrollerImpl(
  world: World,
  from: string,
  event: Event
): Promise<{ world: World; comptrollerImpl: ComptrollerImpl; comptrollerImplData: ComptrollerImplData }> {
  const fetchers = [
    new Fetcher<{ name: StringV }, ComptrollerImplData>(
      `
        #### ScenarioG1

        * "ScenarioG1 name:<String>" - The Comptroller Scenario for local testing (G1)
          * E.g. "ComptrollerImpl Deploy ScenarioG1 MyScen"
      `,
      'ScenarioG1',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await ComptrollerScenarioG1Contract.deploy<ComptrollerImpl>(world, from, []),
        name: name.val,
        contract: 'ComptrollerScenarioG1',
        description: 'ScenarioG1 Comptroller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, ComptrollerImplData>(
      `
        #### ScenarioG2

        * "ScenarioG2 name:<String>" - The Comptroller Scenario for local testing (G2)
          * E.g. "ComptrollerImpl Deploy ScenarioG2 MyScen"
      `,
      'ScenarioG2',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await ComptrollerScenarioG2Contract.deploy<ComptrollerImpl>(world, from, []),
        name: name.val,
        contract: 'ComptrollerScenarioG2Contract',
        description: 'ScenarioG2 Comptroller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, ComptrollerImplData>(
      `
        #### ScenarioG3

        * "ScenarioG3 name:<String>" - The Comptroller Scenario for local testing (G3)
          * E.g. "ComptrollerImpl Deploy ScenarioG3 MyScen"
      `,
      'ScenarioG3',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await ComptrollerScenarioG3Contract.deploy<ComptrollerImpl>(world, from, []),
        name: name.val,
        contract: 'ComptrollerScenarioG3Contract',
        description: 'ScenarioG3 Comptroller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, ComptrollerImplData>(
      `
        #### Scenario

        * "Scenario name:<String>" - The Comptroller Scenario for local testing
          * E.g. "ComptrollerImpl Deploy Scenario MyScen"
      `,
      'Scenario',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await ComptrollerScenarioContract.deploy<ComptrollerImpl>(world, from, []),
        name: name.val,
        contract: 'ComptrollerScenario',
        description: 'Scenario Comptroller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, ComptrollerImplData>(
      `
        #### StandardG1

        * "StandardG1 name:<String>" - The standard generation 1 Comptroller contract
          * E.g. "Comptroller Deploy StandardG1 MyStandard"
      `,
      'StandardG1',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await ComptrollerG1Contract.deploy<ComptrollerImpl>(world, from, []),
          name: name.val,
          contract: 'ComptrollerG1',
          description: 'StandardG1 Comptroller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, ComptrollerImplData>(
      `
        #### StandardG2

        * "StandardG2 name:<String>" - The standard generation 2 Comptroller contract
          * E.g. "Comptroller Deploy StandardG2 MyStandard"
      `,
      'StandardG2',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await ComptrollerG2Contract.deploy<ComptrollerImpl>(world, from, []),
          name: name.val,
          contract: 'ComptrollerG2',
          description: 'StandardG2 Comptroller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, ComptrollerImplData>(
      `
        #### StandardG3

        * "StandardG3 name:<String>" - The standard generation 3 Comptroller contract
          * E.g. "Comptroller Deploy StandardG3 MyStandard"
      `,
      'StandardG3',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await ComptrollerG3Contract.deploy<ComptrollerImpl>(world, from, []),
          name: name.val,
          contract: 'ComptrollerG3',
          description: 'StandardG3 Comptroller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, ComptrollerImplData>(
      `
        #### StandardG4

        * "StandardG4 name:<String>" - The standard generation 4 Comptroller contract
          * E.g. "Comptroller Deploy StandardG4 MyStandard"
      `,
      'StandardG4',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await ComptrollerG4Contract.deploy<ComptrollerImpl>(world, from, []),
          name: name.val,
          contract: 'ComptrollerG4',
          description: 'StandardG4 Comptroller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, ComptrollerImplData>(
      `
        #### Standard

        * "Standard name:<String>" - The standard Comptroller contract
          * E.g. "Comptroller Deploy Standard MyStandard"
      `,
      'Standard',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await ComptrollerContract.deploy<ComptrollerImpl>(world, from, []),
          name: name.val,
          contract: 'Comptroller',
          description: 'Standard Comptroller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, ComptrollerImplData>(
      `
        #### Borked

        * "Borked name:<String>" - A Borked Comptroller for testing
          * E.g. "ComptrollerImpl Deploy Borked MyBork"
      `,
      'Borked',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await ComptrollerBorkedContract.deploy<ComptrollerImpl>(world, from, []),
        name: name.val,
        contract: 'ComptrollerBorked',
        description: 'Borked Comptroller Impl'
      })
    ),
    new Fetcher<{ name: StringV }, ComptrollerImplData>(
      `
        #### Default

        * "name:<String>" - The standard Comptroller contract
          * E.g. "ComptrollerImpl Deploy MyDefault"
      `,
      'Default',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        if (world.isLocalNetwork()) {
          // Note: we're going to use the scenario contract as the standard deployment on local networks
          return {
            invokation: await ComptrollerScenarioContract.deploy<ComptrollerImpl>(world, from, []),
            name: name.val,
            contract: 'ComptrollerScenario',
            description: 'Scenario Comptroller Impl'
          };
        } else {
          return {
            invokation: await ComptrollerContract.deploy<ComptrollerImpl>(world, from, []),
            name: name.val,
            contract: 'Comptroller',
            description: 'Standard Comptroller Impl'
          };
        }
      },
      { catchall: true }
    )
  ];

  let comptrollerImplData = await getFetcherValue<any, ComptrollerImplData>(
    'DeployComptrollerImpl',
    fetchers,
    world,
    event
  );
  let invokation = comptrollerImplData.invokation;
  delete comptrollerImplData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }
  const comptrollerImpl = invokation.value!;

  world = await storeAndSaveContract(world, comptrollerImpl, comptrollerImplData.name, invokation, [
    {
      index: ['Comptroller', comptrollerImplData.name],
      data: {
        address: comptrollerImpl._address,
        contract: comptrollerImplData.contract,
        description: comptrollerImplData.description
      }
    }
  ]);

  return { world, comptrollerImpl, comptrollerImplData };
}
