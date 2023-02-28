import { Event } from "../Event";
import { World } from "../World";
import {
  XErc20Delegate,
  XErc20DelegateScenario,
} from "../Contract/XErc20Delegate";
import { XToken } from "../Contract/XToken";
import { Invokation } from "../Invokation";
import { getStringV } from "../CoreValue";
import { AddressV, NumberV, StringV } from "../Value";
import { Arg, Fetcher, getFetcherValue } from "../Command";
import { storeAndSaveContract } from "../Networks";
import { getContract, getTestContract } from "../Contract";

const CDaiDelegateContract = getContract("CDaiDelegate");
const CDaiDelegateScenarioContract = getTestContract("CDaiDelegateScenario");
const XErc20DelegateContract = getContract("XErc20Delegate");
const XErc20DelegateScenarioContract = getTestContract(
  "XErc20DelegateScenario"
);

export interface XTokenDelegateData {
  invokation: Invokation<XErc20Delegate>;
  name: string;
  contract: string;
  description?: string;
}

export async function buildXTokenDelegate(
  world: World,
  from: string,
  params: Event
): Promise<{
  world: World;
  cTokenDelegate: XErc20Delegate;
  delegateData: XTokenDelegateData;
}> {
  const fetchers = [
    new Fetcher<{ name: StringV }, XTokenDelegateData>(
      `
        #### CDaiDelegate

        * "CDaiDelegate name:<String>"
          * E.g. "XTokenDelegate Deploy CDaiDelegate cDAIDelegate"
      `,
      "CDaiDelegate",
      [new Arg("name", getStringV)],
      async (world, { name }) => {
        return {
          invokation: await CDaiDelegateContract.deploy<XErc20Delegate>(
            world,
            from,
            []
          ),
          name: name.val,
          contract: "CDaiDelegate",
          description: "Standard CDai Delegate",
        };
      }
    ),

    new Fetcher<{ name: StringV }, XTokenDelegateData>(
      `
        #### CDaiDelegateScenario

        * "CDaiDelegateScenario name:<String>" - A CDaiDelegate Scenario for local testing
          * E.g. "XTokenDelegate Deploy CDaiDelegateScenario cDAIDelegate"
      `,
      "CDaiDelegateScenario",
      [new Arg("name", getStringV)],
      async (world, { name }) => {
        return {
          invokation: await CDaiDelegateScenarioContract.deploy<
            XErc20DelegateScenario
          >(world, from, []),
          name: name.val,
          contract: "CDaiDelegateScenario",
          description: "Scenario CDai Delegate",
        };
      }
    ),

    new Fetcher<{ name: StringV }, XTokenDelegateData>(
      `
        #### XErc20Delegate

        * "XErc20Delegate name:<String>"
          * E.g. "XTokenDelegate Deploy XErc20Delegate cDAIDelegate"
      `,
      "XErc20Delegate",
      [new Arg("name", getStringV)],
      async (world, { name }) => {
        return {
          invokation: await XErc20DelegateContract.deploy<XErc20Delegate>(
            world,
            from,
            []
          ),
          name: name.val,
          contract: "XErc20Delegate",
          description: "Standard XErc20 Delegate",
        };
      }
    ),

    new Fetcher<{ name: StringV }, XTokenDelegateData>(
      `
        #### XErc20DelegateScenario

        * "XErc20DelegateScenario name:<String>" - A XErc20Delegate Scenario for local testing
          * E.g. "XTokenDelegate Deploy XErc20DelegateScenario cDAIDelegate"
      `,
      "XErc20DelegateScenario",
      [new Arg("name", getStringV)],
      async (world, { name }) => {
        return {
          invokation: await XErc20DelegateScenarioContract.deploy<
            XErc20DelegateScenario
          >(world, from, []),
          name: name.val,
          contract: "XErc20DelegateScenario",
          description: "Scenario XErc20 Delegate",
        };
      }
    ),
  ];

  let delegateData = await getFetcherValue<any, XTokenDelegateData>(
    "DeployXToken",
    fetchers,
    world,
    params
  );
  let invokation = delegateData.invokation;
  delete delegateData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }

  const cTokenDelegate = invokation.value!;

  world = await storeAndSaveContract(
    world,
    cTokenDelegate,
    delegateData.name,
    invokation,
    [
      {
        index: ["XTokenDelegate", delegateData.name],
        data: {
          address: cTokenDelegate._address,
          contract: delegateData.contract,
          description: delegateData.description,
        },
      },
    ]
  );

  return { world, cTokenDelegate, delegateData };
}
