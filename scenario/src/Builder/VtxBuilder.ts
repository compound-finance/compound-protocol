import { Event } from '../Event';
import { World, addAction } from '../World';
import { Vtx, VtxScenario } from '../Contract/Vtx';
import { Invokation } from '../Invokation';
import { getAddressV } from '../CoreValue';
import { StringV, AddressV } from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { storeAndSaveContract } from '../Networks';
import { getContract } from '../Contract';

const VtxContract = getContract('Vtx');
const VtxScenarioContract = getContract('VtxScenario');

export interface TokenData {
  invokation: Invokation<Vtx>;
  contract: string;
  address?: string;
  symbol: string;
  name: string;
  decimals?: number;
}

export async function buildVtx(
  world: World,
  from: string,
  params: Event
): Promise<{ world: World; vtx: Vtx; tokenData: TokenData }> {
  const fetchers = [
    new Fetcher<{ account: AddressV }, TokenData>(
      `
      #### Scenario

      * "Vtx Deploy Scenario account:<Address>" - Deploys Scenario Vtx Token
        * E.g. "Vtx Deploy Scenario Geoff"
    `,
      'Scenario',
      [
        new Arg("account", getAddressV),
      ],
      async (world, { account }) => {
        return {
          invokation: await VtxScenarioContract.deploy<VtxScenario>(world, from, [account.val]),
          contract: 'VtxScenario',
          symbol: 'VTX',
          name: 'Vortex Governance Token',
          decimals: 18
        };
      }
    ),

    new Fetcher<{ account: AddressV }, TokenData>(
      `
      #### Vtx

      * "Vtx Deploy account:<Address>" - Deploys Vtx Token
        * E.g. "Vtx Deploy Geoff"
    `,
      'Vtx',
      [
        new Arg("account", getAddressV),
      ],
      async (world, { account }) => {
        if (world.isLocalNetwork()) {
          return {
            invokation: await VtxScenarioContract.deploy<VtxScenario>(world, from, [account.val]),
            contract: 'VtxScenario',
            symbol: 'VTX',
            name: 'Vortex Governance Token',
            decimals: 18
          };
        } else {
          return {
            invokation: await VtxContract.deploy<Vtx>(world, from, [account.val]),
            contract: 'Vtx',
            symbol: 'VTX',
            name: 'Vortex Governance Token',
            decimals: 18
          };
        }
      },
      { catchall: true }
    )
  ];

  let tokenData = await getFetcherValue<any, TokenData>("DeployVtx", fetchers, world, params);
  let invokation = tokenData.invokation;
  delete tokenData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }

  const vtx = invokation.value!;
  tokenData.address = vtx._address;

  world = await storeAndSaveContract(
    world,
    vtx,
    'Vtx',
    invokation,
    [
      { index: ['Vtx'], data: tokenData },
      { index: ['Tokens', tokenData.symbol], data: tokenData }
    ]
  );

  tokenData.invokation = invokation;

  return { world, vtx, tokenData };
}
