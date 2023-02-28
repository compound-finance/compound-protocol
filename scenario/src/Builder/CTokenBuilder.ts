import { Event } from "../Event";
import { World } from "../World";
import {
  XErc20Delegator,
  XErc20DelegatorScenario,
} from "../Contract/XErc20Delegator";
import { XToken } from "../Contract/XToken";
import { Invokation, invoke } from "../Invokation";
import {
  getAddressV,
  getExpNumberV,
  getNumberV,
  getStringV,
} from "../CoreValue";
import { AddressV, NumberV, StringV } from "../Value";
import { Arg, Fetcher, getFetcherValue } from "../Command";
import { storeAndSaveContract } from "../Networks";
import { getContract, getTestContract } from "../Contract";

const XErc20Contract = getContract("XErc20Immutable");
const XErc20Delegator = getContract("XErc20Delegator");
const XErc20DelegatorScenario = getTestContract("XErc20DelegatorScenario");
const XEtherContract = getContract("XEther");
const XErc20ScenarioContract = getTestContract("XErc20Scenario");
const XEtherScenarioContract = getTestContract("XEtherScenario");
const CEvilContract = getTestContract("CEvil");

export interface TokenData {
  invokation: Invokation<XToken>;
  name: string;
  symbol: string;
  decimals?: number;
  underlying?: string;
  address?: string;
  contract: string;
  initial_exchange_rate_mantissa?: string;
  admin?: string;
}

export async function buildXToken(
  world: World,
  from: string,
  params: Event
): Promise<{ world: World; cToken: XToken; tokenData: TokenData }> {
  const fetchers = [
    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        underlying: AddressV;
        comptroller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
        admin: AddressV;
        implementation: AddressV;
        becomeImplementationData: StringV;
      },
      TokenData
    >(
      `
      #### XErc20Delegator

      * "XErc20Delegator symbol:<String> name:<String> underlying:<Address> comptroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address> implementation:<Address> becomeImplementationData:<String>" - The real deal XToken
        * E.g. "XToken Deploy XErc20Delegator cDAI \"Compound DAI\" (Erc20 DAI Address) (Comptroller Address) (InterestRateModel Address) 1.0 8 Geoff (XToken CDaiDelegate Address) "0x0123434anyByTes314535q" "
    `,
      "XErc20Delegator",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("comptroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV),
        new Arg("implementation", getAddressV),
        new Arg("becomeImplementationData", getStringV),
      ],
      async (
        world,
        {
          symbol,
          name,
          underlying,
          comptroller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
          implementation,
          becomeImplementationData,
        }
      ) => {
        return {
          invokation: await XErc20Delegator.deploy<XErc20Delegator>(
            world,
            from,
            [
              underlying.val,
              comptroller.val,
              interestRateModel.val,
              initialExchangeRate.val,
              name.val,
              symbol.val,
              decimals.val,
              admin.val,
              implementation.val,
              becomeImplementationData.val,
            ]
          ),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: "XErc20Delegator",
          initial_exchange_rate_mantissa: initialExchangeRate
            .encode()
            .toString(),
          admin: admin.val,
        };
      }
    ),

    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        underlying: AddressV;
        comptroller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
        admin: AddressV;
        implementation: AddressV;
        becomeImplementationData: StringV;
      },
      TokenData
    >(
      `
      #### XErc20DelegatorScenario

      * "XErc20DelegatorScenario symbol:<String> name:<String> underlying:<Address> comptroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address> implementation:<Address> becomeImplementationData:<String>" - A XToken Scenario for local testing
        * E.g. "XToken Deploy XErc20DelegatorScenario cDAI \"Compound DAI\" (Erc20 DAI Address) (Comptroller Address) (InterestRateModel Address) 1.0 8 Geoff (XToken CDaiDelegate Address) "0x0123434anyByTes314535q" "
    `,
      "XErc20DelegatorScenario",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("comptroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV),
        new Arg("implementation", getAddressV),
        new Arg("becomeImplementationData", getStringV),
      ],
      async (
        world,
        {
          symbol,
          name,
          underlying,
          comptroller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
          implementation,
          becomeImplementationData,
        }
      ) => {
        return {
          invokation: await XErc20DelegatorScenario.deploy<
            XErc20DelegatorScenario
          >(world, from, [
            underlying.val,
            comptroller.val,
            interestRateModel.val,
            initialExchangeRate.val,
            name.val,
            symbol.val,
            decimals.val,
            admin.val,
            implementation.val,
            becomeImplementationData.val,
          ]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: "XErc20DelegatorScenario",
          initial_exchange_rate_mantissa: initialExchangeRate
            .encode()
            .toString(),
          admin: admin.val,
        };
      }
    ),

    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        underlying: AddressV;
        comptroller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
        admin: AddressV;
      },
      TokenData
    >(
      `
        #### Scenario

        * "Scenario symbol:<String> name:<String> underlying:<Address> comptroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A XToken Scenario for local testing
          * E.g. "XToken Deploy Scenario cZRX \"Compound ZRX\" (Erc20 ZRX Address) (Comptroller Address) (InterestRateModel Address) 1.0 8"
      `,
      "Scenario",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("comptroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV),
      ],
      async (
        world,
        {
          symbol,
          name,
          underlying,
          comptroller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
        }
      ) => {
        return {
          invokation: await XErc20ScenarioContract.deploy<XToken>(world, from, [
            underlying.val,
            comptroller.val,
            interestRateModel.val,
            initialExchangeRate.val,
            name.val,
            symbol.val,
            decimals.val,
            admin.val,
          ]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: "XErc20Scenario",
          initial_exchange_rate_mantissa: initialExchangeRate
            .encode()
            .toString(),
          admin: admin.val,
        };
      }
    ),

    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        admin: AddressV;
        comptroller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
      },
      TokenData
    >(
      `
        #### XEtherScenario

        * "XEtherScenario symbol:<String> name:<String> comptroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A XToken Scenario for local testing
          * E.g. "XToken Deploy XEtherScenario cETH \"Compound Ether\" (Comptroller Address) (InterestRateModel Address) 1.0 8"
      `,
      "XEtherScenario",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("comptroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV),
      ],
      async (
        world,
        {
          symbol,
          name,
          comptroller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
        }
      ) => {
        return {
          invokation: await XEtherScenarioContract.deploy<XToken>(world, from, [
            name.val,
            symbol.val,
            decimals.val,
            admin.val,
            comptroller.val,
            interestRateModel.val,
            initialExchangeRate.val,
          ]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: "",
          contract: "XEtherScenario",
          initial_exchange_rate_mantissa: initialExchangeRate
            .encode()
            .toString(),
          admin: admin.val,
        };
      }
    ),

    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        admin: AddressV;
        comptroller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
      },
      TokenData
    >(
      `
        #### XEther

        * "XEther symbol:<String> name:<String> comptroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A XToken Scenario for local testing
          * E.g. "XToken Deploy XEther cETH \"Compound Ether\" (Comptroller Address) (InterestRateModel Address) 1.0 8"
      `,
      "XEther",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("comptroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV),
      ],
      async (
        world,
        {
          symbol,
          name,
          comptroller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
        }
      ) => {
        return {
          invokation: await XEtherContract.deploy<XToken>(world, from, [
            comptroller.val,
            interestRateModel.val,
            initialExchangeRate.val,
            name.val,
            symbol.val,
            decimals.val,
            admin.val,
          ]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: "",
          contract: "XEther",
          initial_exchange_rate_mantissa: initialExchangeRate
            .encode()
            .toString(),
          admin: admin.val,
        };
      }
    ),

    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        admin: AddressV;
        underlying: AddressV;
        comptroller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
      },
      TokenData
    >(
      `
        #### XErc20

        * "XErc20 symbol:<String> name:<String> underlying:<Address> comptroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A official XToken contract
          * E.g. "XToken Deploy XErc20 cZRX \"Compound ZRX\" (Erc20 ZRX Address) (Comptroller Address) (InterestRateModel Address) 1.0 8"
      `,
      "XErc20",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("comptroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV),
      ],
      async (
        world,
        {
          symbol,
          name,
          underlying,
          comptroller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
        }
      ) => {
        return {
          invokation: await XErc20Contract.deploy<XToken>(world, from, [
            underlying.val,
            comptroller.val,
            interestRateModel.val,
            initialExchangeRate.val,
            name.val,
            symbol.val,
            decimals.val,
            admin.val,
          ]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: "XErc20",
          initial_exchange_rate_mantissa: initialExchangeRate
            .encode()
            .toString(),
          admin: admin.val,
        };
      }
    ),

    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        admin: AddressV;
        underlying: AddressV;
        comptroller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
      },
      TokenData
    >(
      `
        #### CEvil

        * "CEvil symbol:<String> name:<String> underlying:<Address> comptroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A malicious XToken contract
          * E.g. "XToken Deploy CEvil cEVL \"Compound EVL\" (Erc20 ZRX Address) (Comptroller Address) (InterestRateModel Address) 1.0 8"
      `,
      "CEvil",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("comptroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV),
      ],
      async (
        world,
        {
          symbol,
          name,
          underlying,
          comptroller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
        }
      ) => {
        return {
          invokation: await CEvilContract.deploy<XToken>(world, from, [
            underlying.val,
            comptroller.val,
            interestRateModel.val,
            initialExchangeRate.val,
            name.val,
            symbol.val,
            decimals.val,
            admin.val,
          ]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: "CEvil",
          initial_exchange_rate_mantissa: initialExchangeRate
            .encode()
            .toString(),
          admin: admin.val,
        };
      }
    ),

    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        admin: AddressV;
        underlying: AddressV;
        comptroller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
      },
      TokenData
    >(
      `
        #### Standard

        * "symbol:<String> name:<String> underlying:<Address> comptroller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A official XToken contract
          * E.g. "XToken Deploy Standard cZRX \"Compound ZRX\" (Erc20 ZRX Address) (Comptroller Address) (InterestRateModel Address) 1.0 8"
      `,
      "Standard",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("comptroller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV),
      ],
      async (
        world,
        {
          symbol,
          name,
          underlying,
          comptroller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
        }
      ) => {
        // Note: we're going to use the scenario contract as the standard deployment on local networks
        if (world.isLocalNetwork()) {
          return {
            invokation: await XErc20ScenarioContract.deploy<XToken>(
              world,
              from,
              [
                underlying.val,
                comptroller.val,
                interestRateModel.val,
                initialExchangeRate.val,
                name.val,
                symbol.val,
                decimals.val,
                admin.val,
              ]
            ),
            name: name.val,
            symbol: symbol.val,
            decimals: decimals.toNumber(),
            underlying: underlying.val,
            contract: "XErc20Scenario",
            initial_exchange_rate_mantissa: initialExchangeRate
              .encode()
              .toString(),
            admin: admin.val,
          };
        } else {
          return {
            invokation: await XErc20Contract.deploy<XToken>(world, from, [
              underlying.val,
              comptroller.val,
              interestRateModel.val,
              initialExchangeRate.val,
              name.val,
              symbol.val,
              decimals.val,
              admin.val,
            ]),
            name: name.val,
            symbol: symbol.val,
            decimals: decimals.toNumber(),
            underlying: underlying.val,
            contract: "XErc20Immutable",
            initial_exchange_rate_mantissa: initialExchangeRate
              .encode()
              .toString(),
            admin: admin.val,
          };
        }
      },
      { catchall: true }
    ),
  ];

  let tokenData = await getFetcherValue<any, TokenData>(
    "DeployXToken",
    fetchers,
    world,
    params
  );
  let invokation = tokenData.invokation;
  delete tokenData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }

  const cToken = invokation.value!;
  tokenData.address = cToken._address;

  world = await storeAndSaveContract(
    world,
    cToken,
    tokenData.symbol,
    invokation,
    [
      { index: ["cTokens", tokenData.symbol], data: tokenData },
      { index: ["Tokens", tokenData.symbol], data: tokenData },
    ]
  );

  return { world, cToken, tokenData };
}
