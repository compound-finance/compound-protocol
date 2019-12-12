import { Event } from "../Event";
import { World } from "../World";
import { Governor } from "../Contract/Governor";
import { Invokation } from "../Invokation";
import { getAddressV, getStringV } from "../CoreValue";
import { AddressV, StringV } from "../Value";
import { Arg, Fetcher, getFetcherValue } from "../Command";
import { storeAndSaveContract } from "../Networks";
import { getContract } from "../Contract";

const GovernorAlphaContract = getContract("GovernorAlpha");
const GovernorAlphaScenarioContract = getContract("GovernorAlphaScenario");

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
      { name: StringV, timelock: AddressV, comp: AddressV, guardian: AddressV },
      GovernorData
    >(
      `
      #### GovernorAlpha

      * "Governor Deploy Alpha name:<String> timelock:<Address> comp:<Address> guardian:<Address>" - Deploys Compound Governor Alpha
        * E.g. "Governor Deploy Alpha GovernorScenario (Address Timelock) (Address Comp) Guardian"
    `,
      "Alpha",
      [
        new Arg("name", getStringV),
        new Arg("timelock", getAddressV),
        new Arg("comp", getAddressV),
        new Arg("guardian", getAddressV)
      ],
      async (world, { name, timelock, comp, guardian }) => {
        return {
          invokation: await GovernorAlphaContract.deploy<Governor>(
            world,
            from,
            [timelock.val, comp.val, guardian.val]
          ),
          name: name.val,
          contract: "GovernorAlpha"
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
