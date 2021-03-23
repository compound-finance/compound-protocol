import { Event } from '../Event';
import { addAction, World } from '../World';
import { ControllerImpl } from '../Contract/ControllerImpl';
import { Invokation, invoke } from '../Invokation';
import { getAddressV, getExpNumberV, getNumberV, getStringV } from '../CoreValue';
import { AddressV, NumberV, StringV } from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { storeAndSaveContract } from '../Networks';
import { getContract, getTestContract } from '../Contract';

const ControllerG1Contract = getContract('ControllerG1');
const ControllerScenarioG1Contract = getTestContract('ControllerScenarioG1');

const ControllerG2Contract = getContract('ControllerG2');
const ControllerScenarioG2Contract = getContract('ControllerScenarioG2');

const ControllerG3Contract = getContract('ControllerG3');
const ControllerScenarioG3Contract = getContract('ControllerScenarioG3');

const ControllerG4Contract = getContract('ControllerG4');
const ControllerScenarioG4Contract = getContract('ControllerScenarioG4');

const ControllerG5Contract = getContract('ControllerG5');
const ControllerScenarioG5Contract = getContract('ControllerScenarioG5');

const ControllerG6Contract = getContract('ControllerG6');
const ControllerScenarioG6Contract = getContract('ControllerScenarioG6');

const ControllerScenarioContract = getTestContract('ControllerScenario');
const ControllerContract = getContract('Controller');

const ControllerBorkedContract = getTestContract('ControllerBorked');

export interface ControllerImplData {
  invokation: Invokation<ControllerImpl>;
  name: string;
  contract: string;
  description: string;
}

export async function buildControllerImpl(
  world: World,
  from: string,
  event: Event
): Promise<{ world: World; controllerImpl: ControllerImpl; controllerImplData: ControllerImplData }> {
  const fetchers = [
    new Fetcher<{ name: StringV }, ControllerImplData>(
      `
        #### ScenarioG1

        * "ScenarioG1 name:<String>" - The Controller Scenario for local testing (G1)
          * E.g. "ControllerImpl Deploy ScenarioG1 MyScen"
      `,
      'ScenarioG1',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await ControllerScenarioG1Contract.deploy<ControllerImpl>(world, from, []),
        name: name.val,
        contract: 'ControllerScenarioG1',
        description: 'ScenarioG1 Controller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, ControllerImplData>(
      `
        #### ScenarioG2

        * "ScenarioG2 name:<String>" - The Controller Scenario for local testing (G2)
          * E.g. "ControllerImpl Deploy ScenarioG2 MyScen"
      `,
      'ScenarioG2',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await ControllerScenarioG2Contract.deploy<ControllerImpl>(world, from, []),
        name: name.val,
        contract: 'ControllerScenarioG2Contract',
        description: 'ScenarioG2 Controller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, ControllerImplData>(
      `
        #### ScenarioG3

        * "ScenarioG3 name:<String>" - The Controller Scenario for local testing (G3)
          * E.g. "ControllerImpl Deploy ScenarioG3 MyScen"
      `,
      'ScenarioG3',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await ControllerScenarioG3Contract.deploy<ControllerImpl>(world, from, []),
        name: name.val,
        contract: 'ControllerScenarioG3Contract',
        description: 'ScenarioG3 Controller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, ControllerImplData>(
      `
        #### ScenarioG4
        * "ScenarioG4 name:<String>" - The Controller Scenario for local testing (G4)
          * E.g. "ControllerImpl Deploy ScenarioG4 MyScen"
      `,
      'ScenarioG4',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await ControllerScenarioG4Contract.deploy<ControllerImpl>(world, from, []),
        name: name.val,
        contract: 'ControllerScenarioG4Contract',
        description: 'ScenarioG4 Controller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, ControllerImplData>(
      `
        #### ScenarioG5
        * "ScenarioG5 name:<String>" - The Controller Scenario for local testing (G5)
          * E.g. "ControllerImpl Deploy ScenarioG5 MyScen"
      `,
      'ScenarioG5',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await ControllerScenarioG5Contract.deploy<ControllerImpl>(world, from, []),
        name: name.val,
        contract: 'ControllerScenarioG5Contract',
        description: 'ScenarioG5 Controller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, ControllerImplData>(
      `
        #### ScenarioG6
        * "ScenarioG6 name:<String>" - The Controller Scenario for local testing (G6)
          * E.g. "ControllerImpl Deploy ScenarioG6 MyScen"
      `,
      'ScenarioG6',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await ControllerScenarioG6Contract.deploy<ControllerImpl>(world, from, []),
        name: name.val,
        contract: 'ControllerScenarioG6Contract',
        description: 'ScenarioG6 Controller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, ControllerImplData>(
      `
        #### Scenario

        * "Scenario name:<String>" - The Controller Scenario for local testing
          * E.g. "ControllerImpl Deploy Scenario MyScen"
      `,
      'Scenario',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await ControllerScenarioContract.deploy<ControllerImpl>(world, from, []),
        name: name.val,
        contract: 'ControllerScenario',
        description: 'Scenario Controller Impl'
      })
    ),

    new Fetcher<{ name: StringV }, ControllerImplData>(
      `
        #### StandardG1

        * "StandardG1 name:<String>" - The standard generation 1 Controller contract
          * E.g. "Controller Deploy StandardG1 MyStandard"
      `,
      'StandardG1',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await ControllerG1Contract.deploy<ControllerImpl>(world, from, []),
          name: name.val,
          contract: 'ControllerG1',
          description: 'StandardG1 Controller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, ControllerImplData>(
      `
        #### StandardG2

        * "StandardG2 name:<String>" - The standard generation 2 Controller contract
          * E.g. "Controller Deploy StandardG2 MyStandard"
      `,
      'StandardG2',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await ControllerG2Contract.deploy<ControllerImpl>(world, from, []),
          name: name.val,
          contract: 'ControllerG2',
          description: 'StandardG2 Controller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, ControllerImplData>(
      `
        #### StandardG3

        * "StandardG3 name:<String>" - The standard generation 3 Controller contract
          * E.g. "Controller Deploy StandardG3 MyStandard"
      `,
      'StandardG3',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await ControllerG3Contract.deploy<ControllerImpl>(world, from, []),
          name: name.val,
          contract: 'ControllerG3',
          description: 'StandardG3 Controller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, ControllerImplData>(
      `
        #### StandardG4

        * "StandardG4 name:<String>" - The standard generation 4 Controller contract
          * E.g. "Controller Deploy StandardG4 MyStandard"
      `,
      'StandardG4',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await ControllerG4Contract.deploy<ControllerImpl>(world, from, []),
          name: name.val,
          contract: 'ControllerG4',
          description: 'StandardG4 Controller Impl'
        };
      }
    ),
  
    new Fetcher<{ name: StringV }, ControllerImplData>(
      `
        #### StandardG5
        * "StandardG5 name:<String>" - The standard generation 5 Controller contract
          * E.g. "Controller Deploy StandardG5 MyStandard"
      `,
      'StandardG5',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await ControllerG5Contract.deploy<ControllerImpl>(world, from, []),
          name: name.val,
          contract: 'ControllerG5',
          description: 'StandardG5 Controller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, ControllerImplData>(
      `
        #### StandardG6
        * "StandardG6 name:<String>" - The standard generation 6 Controller contract
          * E.g. "Controller Deploy StandardG6 MyStandard"
      `,
      'StandardG6',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await ControllerG6Contract.deploy<ControllerImpl>(world, from, []),
          name: name.val,
          contract: 'ControllerG6',
          description: 'StandardG6 Controller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, ControllerImplData>(
      `
        #### Standard

        * "Standard name:<String>" - The standard Controller contract
          * E.g. "Controller Deploy Standard MyStandard"
      `,
      'Standard',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        return {
          invokation: await ControllerContract.deploy<ControllerImpl>(world, from, []),
          name: name.val,
          contract: 'Controller',
          description: 'Standard Controller Impl'
        };
      }
    ),

    new Fetcher<{ name: StringV }, ControllerImplData>(
      `
        #### Borked

        * "Borked name:<String>" - A Borked Controller for testing
          * E.g. "ControllerImpl Deploy Borked MyBork"
      `,
      'Borked',
      [new Arg('name', getStringV)],
      async (world, { name }) => ({
        invokation: await ControllerBorkedContract.deploy<ControllerImpl>(world, from, []),
        name: name.val,
        contract: 'ControllerBorked',
        description: 'Borked Controller Impl'
      })
    ),
    new Fetcher<{ name: StringV }, ControllerImplData>(
      `
        #### Default

        * "name:<String>" - The standard Controller contract
          * E.g. "ControllerImpl Deploy MyDefault"
      `,
      'Default',
      [new Arg('name', getStringV)],
      async (world, { name }) => {
        if (world.isLocalNetwork()) {
          // Note: we're going to use the scenario contract as the standard deployment on local networks
          return {
            invokation: await ControllerScenarioContract.deploy<ControllerImpl>(world, from, []),
            name: name.val,
            contract: 'ControllerScenario',
            description: 'Scenario Controller Impl'
          };
        } else {
          return {
            invokation: await ControllerContract.deploy<ControllerImpl>(world, from, []),
            name: name.val,
            contract: 'Controller',
            description: 'Standard Controller Impl'
          };
        }
      },
      { catchall: true }
    )
  ];

  let controllerImplData = await getFetcherValue<any, ControllerImplData>(
    'DeployControllerImpl',
    fetchers,
    world,
    event
  );
  let invokation = controllerImplData.invokation;
  delete controllerImplData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }
  const controllerImpl = invokation.value!;

  world = await storeAndSaveContract(world, controllerImpl, controllerImplData.name, invokation, [
    {
      index: ['Controller', controllerImplData.name],
      data: {
        address: controllerImpl._address,
        contract: controllerImplData.contract,
        description: controllerImplData.description
      }
    }
  ]);

  return { world, controllerImpl, controllerImplData };
}
