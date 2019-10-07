import { Event } from '../Event';
import { World } from '../World';
import { Timelock } from '../Contract/Timelock';
import { Invokation } from '../Invokation';
import { getAddressV, getNumberV } from '../CoreValue';
import { AddressV, NumberV } from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { storeAndSaveContract } from '../Networks';
import { getContract, getTestContract } from '../Contract';

const TimelockContract = getContract('Timelock');
const TimelockScenarioContract = getTestContract('TimelockHarness');

export interface TimelockData {
  invokation: Invokation<Timelock>;
  contract: string;
  description: string;
  address?: string;
  admin: string;
  delay: string | number;
}

export async function buildTimelock(
  world: World,
  from: string,
  event: Event
): Promise<{ world: World; timelock: Timelock; timelockData: TimelockData }> {
  const fetchers = [
    new Fetcher<{ admin: AddressV; delay: NumberV }, TimelockData>(
      `
        #### Scenario

        * "Scenario admin:<Address> delay:<Number>" - The Timelock Scenario for local testing
          * E.g. "Timelock Deploy Scenario Geoff 604800"
      `,
      'Scenario',
      [new Arg('admin', getAddressV), new Arg('delay', getNumberV)],
      async (world, { admin, delay }) => ({
        invokation: await TimelockScenarioContract.deploy<Timelock>(world, from, [admin.val, delay.val]),
        contract: 'TimelockScenario',
        description: 'Scenario Timelock',
        admin: admin.val,
        delay: delay.val
      })
    ),
    new Fetcher<{ admin: AddressV; delay: NumberV }, TimelockData>(
      `
        #### Standard

        * "Standard admin:<Address> delay:<Number>" - The standard Timelock contract
          * E.g. "Timelock Deploy Standard Geoff 604800"
      `,
      'Standard',
      [new Arg('admin', getAddressV), new Arg('delay', getNumberV)],
      async (world, { admin, delay }) => ({
        invokation: await TimelockContract.deploy<Timelock>(world, from, [admin.val, delay.val]),
        contract: 'Timelock',
        description: 'Scenario',
        admin: admin.val,
        delay: delay.val
      })
    ),
    new Fetcher<{ admin: AddressV; delay: NumberV }, TimelockData>(
      `
        #### Default

        * "name:<String>" - The standard Timelock contract
          * E.g. "Timelock Deploy Geoff 604800"
      `,
      'Default',
      [new Arg('admin', getAddressV), new Arg('delay', getNumberV)],
      async (world, { admin, delay }) => {
        if (world.isLocalNetwork()) {
          // Note: we're going to use the scenario contract as the standard deployment on local networks
          return {
            invokation: await TimelockScenarioContract.deploy<Timelock>(world, from, [admin.val, delay.val]),
            contract: 'TimelockScenario',
            description: 'Scenario Timelock',
            admin: admin.val,
            delay: delay.val
          };
        } else {
          return {
            invokation: await TimelockContract.deploy<Timelock>(world, from, [admin.val, delay.val]),
            contract: 'Timelock',
            description: 'Scenario',
            admin: admin.val,
            delay: delay.val
          };
        }
      },
      { catchall: true }
    )
  ];

  const timelockData = await getFetcherValue<any, TimelockData>('DeployTimelock', fetchers, world, event);
  const invokation = timelockData.invokation;
  delete timelockData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }
  const timelock = invokation.value!;
  timelockData.address = timelock._address;

  world = await storeAndSaveContract(world, timelock, 'Timelock', invokation, [
    {
      index: ['Timelock'],
      data: {
        address: timelock._address,
        contract: timelockData.contract,
        description: timelockData.description
      }
    }
  ]);

  return { world, timelock, timelockData };
}
