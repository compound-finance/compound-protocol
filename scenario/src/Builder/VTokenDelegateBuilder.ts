import { Event } from '../Event';
import { World } from '../World';
import { VErc20Delegate, VErc20DelegateScenario } from '../Contract/VErc20Delegate';
import { VToken } from '../Contract/VToken';
import { Invokation } from '../Invokation';
import { getStringV } from '../CoreValue';
import { AddressV, NumberV, StringV } from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { storeAndSaveContract } from '../Networks';
import { getContract, getTestContract } from '../Contract';

const VDaiDelegateContract = getContract('VDaiDelegate');
const VDaiDelegateScenarioContract = getTestContract('VDaiDelegateScenario');
const VErc20DelegateContract = getContract('VErc20Delegate');
const VErc20DelegateScenarioContract = getTestContract('VErc20DelegateScenario');


export interface VTokenDelegateData {
  invokation: Invokation<VErc20Delegate>;
  name: string;
  contract: string;
  description?: string;
}

export async function buildVTokenDelegate(
  world: World,
  from: string,
  params: Event
): Promise<{ world: World; vTokenDelegate: VErc20Delegate; delegateData: VTokenDelegateData }> {
  const fetchers = [
    new Fetcher<{ name: StringV; }, VTokenDelegateData>(
      `
        #### VDaiDelegate

        * "VDaiDelegate name:<String>"
          * E.g. "VTokenDelegate Deploy VDaiDelegate vDAIDelegate"
      `,
      'VDaiDelegate',
      [
        new Arg('name', getStringV)
      ],
      async (
        world,
        { name }
      ) => {
        return {
          invokation: await VDaiDelegateContract.deploy<VErc20Delegate>(world, from, []),
          name: name.val,
          contract: 'VDaiDelegate',
          description: 'Standard VDai Delegate'
        };
      }
    ),

    new Fetcher<{ name: StringV; }, VTokenDelegateData>(
      `
        #### VDaiDelegateScenario

        * "VDaiDelegateScenario name:<String>" - A VDaiDelegate Scenario for local testing
          * E.g. "VTokenDelegate Deploy VDaiDelegateScenario vDAIDelegate"
      `,
      'VDaiDelegateScenario',
      [
        new Arg('name', getStringV)
      ],
      async (
        world,
        { name }
      ) => {
        return {
          invokation: await VDaiDelegateScenarioContract.deploy<VErc20DelegateScenario>(world, from, []),
          name: name.val,
          contract: 'VDaiDelegateScenario',
          description: 'Scenario VDai Delegate'
        };
      }
    ),

    new Fetcher<{ name: StringV; }, VTokenDelegateData>(
      `
        #### VErc20Delegate

        * "VErc20Delegate name:<String>"
          * E.g. "VTokenDelegate Deploy VErc20Delegate vDAIDelegate"
      `,
      'VErc20Delegate',
      [
        new Arg('name', getStringV)
      ],
      async (
        world,
        { name }
      ) => {
        return {
          invokation: await VErc20DelegateContract.deploy<VErc20Delegate>(world, from, []),
          name: name.val,
          contract: 'VErc20Delegate',
          description: 'Standard VErc20 Delegate'
        };
      }
    ),

    new Fetcher<{ name: StringV; }, VTokenDelegateData>(
      `
        #### VErc20DelegateScenario

        * "VErc20DelegateScenario name:<String>" - A VErc20Delegate Scenario for local testing
          * E.g. "VTokenDelegate Deploy VErc20DelegateScenario vDAIDelegate"
      `,
      'VErc20DelegateScenario',
      [
        new Arg('name', getStringV),
      ],
      async (
        world,
        { name }
      ) => {
        return {
          invokation: await VErc20DelegateScenarioContract.deploy<VErc20DelegateScenario>(world, from, []),
          name: name.val,
          contract: 'VErc20DelegateScenario',
          description: 'Scenario VErc20 Delegate'
        };
      }
    )
  ];

  let delegateData = await getFetcherValue<any, VTokenDelegateData>("DeployVToken", fetchers, world, params);
  let invokation = delegateData.invokation;
  delete delegateData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }

  const vTokenDelegate = invokation.value!;

  world = await storeAndSaveContract(
    world,
    vTokenDelegate,
    delegateData.name,
    invokation,
    [
      {
        index: ['VTokenDelegate', delegateData.name],
        data: {
          address: vTokenDelegate._address,
          contract: delegateData.contract,
          description: delegateData.description
        }
      }
    ]
  );

  return { world, vTokenDelegate, delegateData };
}
