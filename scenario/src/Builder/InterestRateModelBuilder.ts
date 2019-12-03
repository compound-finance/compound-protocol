import {Event} from '../Event';
import {addAction, World} from '../World';
import {InterestRateModel} from '../Contract/InterestRateModel';
import {Invokation, invoke} from '../Invokation';
import {
  getExpNumberV,
  getNumberV,
  getPercentV,
  getStringV,
} from '../CoreValue';
import {
  EventV,
  NumberV,
  StringV,
} from '../Value';
import {Arg, Fetcher, getFetcherValue} from '../Command';
import {storeAndSaveContract} from '../Networks';
import {getContract, getTestContract} from '../Contract';

const FixedInterestRateModel = getTestContract('InterestRateModelHarness');
const WhitePaperInterestRateModel = getContract('WhitePaperInterestRateModel');
const JumpRateModel = getContract('JumpRateModel');

export interface InterestRateModelData {
  invokation: Invokation<InterestRateModel>
  address?: string
  name: string
  contract: string
  description: string
  base?: string
  slope?: string
  kink?: string
  jump?: string
}

export async function buildInterestRateModel(world: World, from: string, event: Event): Promise<{world: World, interestRateModel: InterestRateModel, interestRateModelData: InterestRateModelData}> {
  const fetchers = [
    new Fetcher<{name: StringV, rate: NumberV}, InterestRateModelData>(`
        #### Fixed

        * "Fixed name:<String> rate:<Number>" - Fixed interest **per-block** rate
          * E.g. "InterestRateModel Deploy Fixed MyInterestRateModel 0.5"
      `,
      "Fixed",
      [
        new Arg("name", getStringV),
        new Arg("rate", getPercentV),
      ],
      async (world, {name, rate}) => ({
        invokation: await FixedInterestRateModel.deploy<InterestRateModel>(world, from, [rate.val]),
        name: name.val,
        contract: "InterestRateModelHarness",
        description: `Fixed rate ${rate.show()} per block`
      })
    ),

    new Fetcher<{name: StringV, baseRate: NumberV, multiplier: NumberV}, InterestRateModelData>(`
        #### WhitePaper

        * "WhitePaper name:<String> baseRate:<Number> multiplier:<Number>" - The WhitePaper interest rate
          * E.g. "InterestRateModel Deploy WhitePaper MyInterestRateModel 0.05 0.2" - 5% base rate and 20% utilization multiplier
      `,
      "WhitePaper",
      [
        new Arg("name", getStringV),
        new Arg("baseRate", getExpNumberV),
        new Arg("multiplier", getExpNumberV)
      ],
      async (world, {name, baseRate, multiplier}) => ({
        invokation: await WhitePaperInterestRateModel.deploy<InterestRateModel>(world, from, [baseRate.val, multiplier.val]),
        name: name.val,
        contract: "WhitePaperInterestRateModel",
        description: `WhitePaper baseRate=${baseRate.val} multiplier=${multiplier.val}`,
        base: baseRate.encode().toString(),
        slope: multiplier.encode().toString()
      })
                                                                                               ),


    new Fetcher<{name: StringV, baseRate: NumberV, multiplier: NumberV, kink: NumberV, jump: NumberV}, InterestRateModelData>(`
#### JumpRateModel

* "JumpRateModel name:<String> baseRate:<Number> multiplier:<Number> kink:<Number> jump:<Number>" - The Jump interest rate
* E.g. "InterestRateModel Deploy JumpRateModel MyInterestRateModel 0.05 0.2 0.90 5" - 5% base rate and 20% utilization multiplier and 5x jump at 90% utilization
`,
                                                                                                "JumpRateModel",
                                                                                                [
                                                                                                  new Arg("name", getStringV),
                                                                                                  new Arg("baseRate", getExpNumberV),
                                                                                                  new Arg("multiplier", getExpNumberV),
                                                                                                  new Arg("kink", getExpNumberV),
                                                                                                  new Arg("jump", getNumberV)
                                                                                                ],
                                                                                                async (world, {name, baseRate, multiplier, kink, jump}) => ({
                                                                                                  invokation: await JumpRateModel.deploy<InterestRateModel>(world, from, [baseRate.val, multiplier.val, kink.val, jump.val]),
                                                                                                  name: name.val,
                                                                                                  contract: "JumpRateModel",
                                                                                                  description: `JumpRate model baseRate=${baseRate.val} multiplier=${multiplier.val} kink=${kink.val} jump=${jump.val}`,
                                                                                                  base: baseRate.encode().toString(),
                                                                                                  slope: multiplier.encode().toString(),
                                                                                                  kink: kink.encode().toString(),
                                                                                                  jump: jump.encode().toString()
                                                                                                })
                                                                                               )
  ];

  let interestRateModelData = await getFetcherValue<any, InterestRateModelData>("DeployInterestRateModel", fetchers, world, event);
  let invokation = interestRateModelData.invokation;
  delete interestRateModelData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }
  const interestRateModel = invokation.value!;
  interestRateModelData.address = interestRateModel._address;

  world = await storeAndSaveContract(
    world,
    interestRateModel,
    interestRateModelData.name,
    invokation,
    [
      {
        index: ['InterestRateModel', interestRateModelData.name],
        data: interestRateModelData
      }
    ]
  );

  return {world, interestRateModel, interestRateModelData};
}
