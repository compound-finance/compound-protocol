import { Event } from '../Event';
import { World } from '../World';
import { VErc20Delegator, VErc20DelegatorScenario } from '../Contract/VErc20Delegator';
import { VToken } from '../Contract/VToken';
import { Invokation, invoke } from '../Invokation';
import { getAddressV, getExpNumberV, getNumberV, getStringV } from '../CoreValue';
import { AddressV, NumberV, StringV } from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { storeAndSaveContract } from '../Networks';
import { getContract, getTestContract } from '../Contract';

const VErc20Contract = getContract('VErc20Immutable');
const VErc20Delegator = getContract('VErc20Delegator');
const VErc20DelegatorScenario = getTestContract('VErc20DelegatorScenario');
const VEtherContract = getContract('VEther');
const VErc20ScenarioContract = getTestContract('VErc20Scenario');
const VEtherScenarioContract = getTestContract('VEtherScenario');
const CEvilContract = getTestContract('CEvil');

export interface TokenData {
  invokation: Invokation<VToken>;
  name: string;
  symbol: string;
  decimals?: number;
  underlying?: string;
  address?: string;
  contract: string;
  initial_exchange_rate_mantissa?: string;
  admin?: string;
}

export async function buildVToken(
  world: World,
  from: string,
  params: Event
): Promise<{ world: World; vToken: VToken; tokenData: TokenData }> {
  const fetchers = [
    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        underlying: AddressV;
        controller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
        admin: AddressV;
        implementation: AddressV;
        becomeImplementationData: StringV;
      },
      TokenData
    >(
    `
      #### VErc20Delegator

      * "VErc20Delegator symbol:<String> name:<String> underlying:<Address> controller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address> implementation:<Address> becomeImplementationData:<String>" - The real deal VToken
        * E.g. "VToken Deploy VErc20Delegator vDAI \"Vortex DAI\" (Erc20 DAI Address) (Controller Address) (InterestRateModel Address) 1.0 8 Geoff (VToken VDaiDelegate Address) "0x0123434anyByTes314535q" "
    `,
      'VErc20Delegator',
      [
        new Arg('symbol', getStringV),
        new Arg('name', getStringV),
        new Arg('underlying', getAddressV),
        new Arg('controller', getAddressV),
        new Arg('interestRateModel', getAddressV),
        new Arg('initialExchangeRate', getExpNumberV),
        new Arg('decimals', getNumberV),
        new Arg('admin', getAddressV),
        new Arg('implementation', getAddressV),
        new Arg('becomeImplementationData', getStringV)
      ],
      async (
        world,
        {
          symbol,
          name,
          underlying,
          controller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
          implementation,
          becomeImplementationData
        }
      ) => {
        return {
          invokation: await VErc20Delegator.deploy<VErc20Delegator>(world, from, [
            underlying.val,
            controller.val,
            interestRateModel.val,
            initialExchangeRate.val,
            name.val,
            symbol.val,
            decimals.val,
            admin.val,
            implementation.val,
            becomeImplementationData.val
          ]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: 'VErc20Delegator',
          initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
          admin: admin.val
        };
      }
    ),

    new Fetcher<
      {
        symbol: StringV;
        name: StringV;
        decimals: NumberV;
        underlying: AddressV;
        controller: AddressV;
        interestRateModel: AddressV;
        initialExchangeRate: NumberV;
        admin: AddressV;
        implementation: AddressV;
        becomeImplementationData: StringV;
      },
      TokenData
    >(
    `
      #### VErc20DelegatorScenario

      * "VErc20DelegatorScenario symbol:<String> name:<String> underlying:<Address> controller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address> implementation:<Address> becomeImplementationData:<String>" - A VToken Scenario for local testing
        * E.g. "VToken Deploy VErc20DelegatorScenario vDAI \"Vortex DAI\" (Erc20 DAI Address) (Controller Address) (InterestRateModel Address) 1.0 8 Geoff (VToken VDaiDelegate Address) "0x0123434anyByTes314535q" "
    `,
      'VErc20DelegatorScenario',
      [
        new Arg('symbol', getStringV),
        new Arg('name', getStringV),
        new Arg('underlying', getAddressV),
        new Arg('controller', getAddressV),
        new Arg('interestRateModel', getAddressV),
        new Arg('initialExchangeRate', getExpNumberV),
        new Arg('decimals', getNumberV),
        new Arg('admin', getAddressV),
        new Arg('implementation', getAddressV),
        new Arg('becomeImplementationData', getStringV)
      ],
      async (
        world,
        {
          symbol,
          name,
          underlying,
          controller,
          interestRateModel,
          initialExchangeRate,
          decimals,
          admin,
          implementation,
          becomeImplementationData
        }
      ) => {
        return {
          invokation: await VErc20DelegatorScenario.deploy<VErc20DelegatorScenario>(world, from, [
            underlying.val,
            controller.val,
            interestRateModel.val,
            initialExchangeRate.val,
            name.val,
            symbol.val,
            decimals.val,
            admin.val,
            implementation.val,
            becomeImplementationData.val
          ]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: 'VErc20DelegatorScenario',
          initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
          admin: admin.val
        };
      }
    ),

    new Fetcher<{symbol: StringV, name: StringV, decimals: NumberV, underlying: AddressV, controller: AddressV, interestRateModel: AddressV, initialExchangeRate: NumberV, admin: AddressV}, TokenData>(`
        #### Scenario

        * "Scenario symbol:<String> name:<String> underlying:<Address> controller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A VToken Scenario for local testing
          * E.g. "VToken Deploy Scenario cZRX \"Vortex ZRX\" (Erc20 ZRX Address) (Controller Address) (InterestRateModel Address) 1.0 8"
      `,
      "Scenario",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("controller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV)
      ],
      async (world, {symbol, name, underlying, controller, interestRateModel, initialExchangeRate, decimals, admin}) => {
        return {
          invokation: await VErc20ScenarioContract.deploy<VToken>(world, from, [underlying.val, controller.val, interestRateModel.val, initialExchangeRate.val, name.val, symbol.val, decimals.val, admin.val]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: 'VErc20Scenario',
          initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
          admin: admin.val
        };
      }
    ),

    new Fetcher<{symbol: StringV, name: StringV, decimals: NumberV, admin: AddressV, controller: AddressV, interestRateModel: AddressV, initialExchangeRate: NumberV}, TokenData>(`
        #### VEtherScenario

        * "VEtherScenario symbol:<String> name:<String> controller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A VToken Scenario for local testing
          * E.g. "VToken Deploy VEtherScenario vETH \"Vortex Ether\" (Controller Address) (InterestRateModel Address) 1.0 8"
      `,
      "VEtherScenario",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("controller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV)
      ],
      async (world, {symbol, name, controller, interestRateModel, initialExchangeRate, decimals, admin}) => {
        return {
          invokation: await VEtherScenarioContract.deploy<VToken>(world, from, [name.val, symbol.val, decimals.val, admin.val, controller.val, interestRateModel.val, initialExchangeRate.val]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: "",
          contract: 'VEtherScenario',
          initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
          admin: admin.val
        };
      }
    ),

    new Fetcher<{symbol: StringV, name: StringV, decimals: NumberV, admin: AddressV, controller: AddressV, interestRateModel: AddressV, initialExchangeRate: NumberV}, TokenData>(`
        #### VEther

        * "VEther symbol:<String> name:<String> controller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A VToken Scenario for local testing
          * E.g. "VToken Deploy VEther vETH \"Vortex Ether\" (Controller Address) (InterestRateModel Address) 1.0 8"
      `,
      "VEther",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("controller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV)
      ],
      async (world, {symbol, name, controller, interestRateModel, initialExchangeRate, decimals, admin}) => {
        return {
          invokation: await VEtherContract.deploy<VToken>(world, from, [controller.val, interestRateModel.val, initialExchangeRate.val, name.val, symbol.val, decimals.val, admin.val]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: "",
          contract: 'VEther',
          initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
          admin: admin.val
        };
      }
    ),

    new Fetcher<{symbol: StringV, name: StringV, decimals: NumberV, admin: AddressV, underlying: AddressV, controller: AddressV, interestRateModel: AddressV, initialExchangeRate: NumberV}, TokenData>(`
        #### VErc20

        * "VErc20 symbol:<String> name:<String> underlying:<Address> controller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A official VToken contract
          * E.g. "VToken Deploy VErc20 cZRX \"Vortex ZRX\" (Erc20 ZRX Address) (Controller Address) (InterestRateModel Address) 1.0 8"
      `,
      "VErc20",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("controller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV)
      ],
      async (world, {symbol, name, underlying, controller, interestRateModel, initialExchangeRate, decimals, admin}) => {

        return {
          invokation: await VErc20Contract.deploy<VToken>(world, from, [underlying.val, controller.val, interestRateModel.val, initialExchangeRate.val, name.val, symbol.val, decimals.val, admin.val]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: 'VErc20',
          initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
          admin: admin.val
        };
      }
    ),

    new Fetcher<{symbol: StringV, name: StringV, decimals: NumberV, admin: AddressV, underlying: AddressV, controller: AddressV, interestRateModel: AddressV, initialExchangeRate: NumberV}, TokenData>(`
        #### CEvil

        * "CEvil symbol:<String> name:<String> underlying:<Address> controller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A malicious VToken contract
          * E.g. "VToken Deploy CEvil cEVL \"Vortex EVL\" (Erc20 ZRX Address) (Controller Address) (InterestRateModel Address) 1.0 8"
      `,
      "CEvil",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("controller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV)
      ],
      async (world, {symbol, name, underlying, controller, interestRateModel, initialExchangeRate, decimals, admin}) => {
        return {
          invokation: await CEvilContract.deploy<VToken>(world, from, [underlying.val, controller.val, interestRateModel.val, initialExchangeRate.val, name.val, symbol.val, decimals.val, admin.val]),
          name: name.val,
          symbol: symbol.val,
          decimals: decimals.toNumber(),
          underlying: underlying.val,
          contract: 'CEvil',
          initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
          admin: admin.val
        };
      }
    ),

    new Fetcher<{symbol: StringV, name: StringV, decimals: NumberV, admin: AddressV, underlying: AddressV, controller: AddressV, interestRateModel: AddressV, initialExchangeRate: NumberV}, TokenData>(`
        #### Standard

        * "symbol:<String> name:<String> underlying:<Address> controller:<Address> interestRateModel:<Address> initialExchangeRate:<Number> decimals:<Number> admin: <Address>" - A official VToken contract
          * E.g. "VToken Deploy Standard cZRX \"Vortex ZRX\" (Erc20 ZRX Address) (Controller Address) (InterestRateModel Address) 1.0 8"
      `,
      "Standard",
      [
        new Arg("symbol", getStringV),
        new Arg("name", getStringV),
        new Arg("underlying", getAddressV),
        new Arg("controller", getAddressV),
        new Arg("interestRateModel", getAddressV),
        new Arg("initialExchangeRate", getExpNumberV),
        new Arg("decimals", getNumberV),
        new Arg("admin", getAddressV)
      ],
      async (world, {symbol, name, underlying, controller, interestRateModel, initialExchangeRate, decimals, admin}) => {
        // Note: we're going to use the scenario contract as the standard deployment on local networks
        if (world.isLocalNetwork()) {
          return {
            invokation: await VErc20ScenarioContract.deploy<VToken>(world, from, [underlying.val, controller.val, interestRateModel.val, initialExchangeRate.val, name.val, symbol.val, decimals.val, admin.val]),
            name: name.val,
            symbol: symbol.val,
            decimals: decimals.toNumber(),
            underlying: underlying.val,
            contract: 'VErc20Scenario',
            initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
            admin: admin.val
          };
        } else {
          return {
            invokation: await VErc20Contract.deploy<VToken>(world, from, [underlying.val, controller.val, interestRateModel.val, initialExchangeRate.val, name.val, symbol.val, decimals.val, admin.val]),
            name: name.val,
            symbol: symbol.val,
            decimals: decimals.toNumber(),
            underlying: underlying.val,
            contract: 'VErc20Immutable',
            initial_exchange_rate_mantissa: initialExchangeRate.encode().toString(),
            admin: admin.val
          };
        }
      },
      {catchall: true}
    )
  ];

  let tokenData = await getFetcherValue<any, TokenData>("DeployVToken", fetchers, world, params);
  let invokation = tokenData.invokation;
  delete tokenData.invokation;

  if (invokation.error) {
    throw invokation.error;
  }

  const vToken = invokation.value!;
  tokenData.address = vToken._address;

  world = await storeAndSaveContract(
    world,
    vToken,
    tokenData.symbol,
    invokation,
    [
      { index: ['vTokens', tokenData.symbol], data: tokenData },
      { index: ['Tokens', tokenData.symbol], data: tokenData }
    ]
  );

  return {world, vToken, tokenData};
}
