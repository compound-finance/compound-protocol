import { Event } from "../Event";
import { World } from "../World";
import { Governor } from "../Contract/Governor";
import { Invokation } from "../Invokation";
import { getAddressV, getNumberV, getStringV } from "../CoreValue";
import { AddressV, NumberV, StringV } from "../Value";
import { Arg, Fetcher, getFetcherValue } from "../Command";
import { storeAndSaveContract } from "../Networks";
import { getContract } from "../Contract";

const GovernorAlphaContract = getContract("GovernorAlpha");
const GovernorAlphaHarnessContract = getContract("GovernorAlphaHarness");

export interface GovernorData {
  invokation: Invokation<Governor>;
  name: string;
  contract: string;
  address?: string;
}

export async function buildGovernor(
  world: World,
  from: string,
  params: Event
): Promise<{ world: World; governor: Governor; govData: GovernorData }> {
  const fetchers = [
    new Fetcher<
      { name: StringV, timelock: AddressV, vtx: AddressV, guardian: AddressV },
      GovernorData
    >(
      `
      #### GovernorAlpha

      * "Governor Deploy Alpha name:<String> timelock:<Address> vtx:<Address> guardian:<Address>" - Deploys Vortex Governor Alpha
        * E.g. "Governor Deploy Alpha GovernorAlpha (Address Timelock) (Address Vtx) Guardian"
    `,
      "Alpha",
      [
        new Arg("name", getStringV),
        new Arg("timelock", getAddressV),
        new Arg("vtx", getAddressV),
        new Arg("guardian", getAddressV)
      ],
      async (world, { name, timelock, vtx, guardian }) => {
        return {
          invokation: await GovernorAlphaContract.deploy<Governor>(
            world,
            from,
            [timelock.val, vtx.val, guardian.val]
          ),
          name: name.val,
          contract: "GovernorAlpha"
        };
      }
    ),
    new Fetcher<
      { name: StringV, timelock: AddressV, vtx: AddressV, guardian: AddressV},
      GovernorData
    >(
      `
      #### GovernorAlphaHarness

      * "Governor Deploy AlphaHarness name:<String> timelock:<Address> vtx:<Address> guardian:<Address>" - Deploys Vortex Governor Alpha with a mocked voting period
        * E.g. "Governor Deploy AlphaHarness GovernorAlphaHarness (Address Timelock) (Address Vtx) Guardian"
    `,
      "AlphaHarness",
      [
        new Arg("name", getStringV),
        new Arg("timelock", getAddressV),
        new Arg("vtx", getAddressV),
        new Arg("guardian", getAddressV)
      ],
      async (world, { name, timelock, vtx, guardian }) => {
        return {
          invokation: await GovernorAlphaHarnessContract.deploy<Governor>(
            world,
            from,
            [timelock.val, vtx.val, guardian.val]
          ),
          name: name.val,
          contract: "GovernorAlphaHarness"
        };
      }
    )

  ];

  let govData = await getFetcherValue<any, GovernorData>(
    "DeployGovernor",
    fetchers,
    world,
    params
  );
  let invokation = govData.invokation;
  delete govData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }

  const governor = invokation.value!;
  govData.address = governor._address;

  world = await storeAndSaveContract(
    world,
    governor,
    govData.name,
    invokation,
    [
      { index: ["Governor", govData.name], data: govData },
    ]
  );

  return { world, governor, govData };
}
