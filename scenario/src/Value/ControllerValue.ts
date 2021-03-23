import {Event} from '../Event';
import {World} from '../World';
import {Controller} from '../Contract/Controller';
import {VToken} from '../Contract/VToken';
import {
  getAddressV,
  getCoreValue,
  getStringV,
  getNumberV
} from '../CoreValue';
import {
  AddressV,
  BoolV,
  ListV,
  NumberV,
  StringV,
  Value
} from '../Value';
import {Arg, Fetcher, getFetcherValue} from '../Command';
import {getController} from '../ContractLookup';
import {encodedNumber} from '../Encoding';
import {getVTokenV} from '../Value/VTokenValue';
import { encodeParameters, encodeABI } from '../Utils';

export async function getControllerAddress(world: World, controller: Controller): Promise<AddressV> {
  return new AddressV(controller._address);
}

export async function getLiquidity(world: World, controller: Controller, user: string): Promise<NumberV> {
  let {0: error, 1: liquidity, 2: shortfall} = await controller.methods.getAccountLiquidity(user).call();
  if (Number(error) != 0) {
    throw new Error(`Failed to compute account liquidity: error code = ${error}`);
  }
  return new NumberV(Number(liquidity) - Number(shortfall));
}

export async function getHypotheticalLiquidity(world: World, controller: Controller, account: string, asset: string, redeemTokens: encodedNumber, borrowAmount: encodedNumber): Promise<NumberV> {
  let {0: error, 1: liquidity, 2: shortfall} = await controller.methods.getHypotheticalAccountLiquidity(account, asset, redeemTokens, borrowAmount).call();
  if (Number(error) != 0) {
    throw new Error(`Failed to compute account hypothetical liquidity: error code = ${error}`);
  }
  return new NumberV(Number(liquidity) - Number(shortfall));
}

async function getPriceOracle(world: World, controller: Controller): Promise<AddressV> {
  return new AddressV(await controller.methods.oracle().call());
}

async function getCloseFactor(world: World, controller: Controller): Promise<NumberV> {
  return new NumberV(await controller.methods.closeFactorMantissa().call(), 1e18);
}

async function getMaxAssets(world: World, controller: Controller): Promise<NumberV> {
  return new NumberV(await controller.methods.maxAssets().call());
}

async function getLiquidationIncentive(world: World, controller: Controller): Promise<NumberV> {
  return new NumberV(await controller.methods.liquidationIncentiveMantissa().call(), 1e18);
}

async function getImplementation(world: World, controller: Controller): Promise<AddressV> {
  return new AddressV(await controller.methods.controllerImplementation().call());
}

async function getBlockNumber(world: World, controller: Controller): Promise<NumberV> {
  return new NumberV(await controller.methods.getBlockNumber().call());
}

async function getAdmin(world: World, controller: Controller): Promise<AddressV> {
  return new AddressV(await controller.methods.admin().call());
}

async function getPendingAdmin(world: World, controller: Controller): Promise<AddressV> {
  return new AddressV(await controller.methods.pendingAdmin().call());
}

async function getCollateralFactor(world: World, controller: Controller, vToken: VToken): Promise<NumberV> {
  let {0: _isListed, 1: collateralFactorMantissa} = await controller.methods.markets(vToken._address).call();
  return new NumberV(collateralFactorMantissa, 1e18);
}

async function membershipLength(world: World, controller: Controller, user: string): Promise<NumberV> {
  return new NumberV(await controller.methods.membershipLength(user).call());
}

async function checkMembership(world: World, controller: Controller, user: string, vToken: VToken): Promise<BoolV> {
  return new BoolV(await controller.methods.checkMembership(user, vToken._address).call());
}

async function getAssetsIn(world: World, controller: Controller, user: string): Promise<ListV> {
  let assetsList = await controller.methods.getAssetsIn(user).call();

  return new ListV(assetsList.map((a) => new AddressV(a)));
}

async function getVtxMarkets(world: World, controller: Controller): Promise<ListV> {
  let mkts = await controller.methods.getVtxMarkets().call();

  return new ListV(mkts.map((a) => new AddressV(a)));
}

async function checkListed(world: World, controller: Controller, vToken: VToken): Promise<BoolV> {
  let {0: isListed, 1: _collateralFactorMantissa} = await controller.methods.markets(vToken._address).call();

  return new BoolV(isListed);
}

async function checkIsVtxed(world: World, controller: Controller, vToken: VToken): Promise<BoolV> {
  let {0: isListed, 1: _collateralFactorMantissa, 2: isVtxed} = await controller.methods.markets(vToken._address).call();
  return new BoolV(isVtxed);
}


export function controllerFetchers() {
  return [
    new Fetcher<{controller: Controller}, AddressV>(`
        #### Address

        * "Controller Address" - Returns address of controller
      `,
      "Address",
      [new Arg("controller", getController, {implicit: true})],
      (world, {controller}) => getControllerAddress(world, controller)
    ),
    new Fetcher<{controller: Controller, account: AddressV}, NumberV>(`
        #### Liquidity

        * "Controller Liquidity <User>" - Returns a given user's trued up liquidity
          * E.g. "Controller Liquidity Geoff"
      `,
      "Liquidity",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("account", getAddressV)
      ],
      (world, {controller, account}) => getLiquidity(world, controller, account.val)
    ),
    new Fetcher<{controller: Controller, account: AddressV, action: StringV, amount: NumberV, vToken: VToken}, NumberV>(`
        #### Hypothetical

        * "Controller Hypothetical <User> <Action> <Asset> <Number>" - Returns a given user's trued up liquidity given a hypothetical change in asset with redeeming a certain number of tokens and/or borrowing a given amount.
          * E.g. "Controller Hypothetical Geoff Redeems 6.0 cZRX"
          * E.g. "Controller Hypothetical Geoff Borrows 5.0 cZRX"
      `,
      "Hypothetical",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("account", getAddressV),
        new Arg("action", getStringV),
        new Arg("amount", getNumberV),
        new Arg("vToken", getVTokenV)
      ],
      async (world, {controller, account, action, vToken, amount}) => {
        let redeemTokens: NumberV;
        let borrowAmount: NumberV;

        switch (action.val.toLowerCase()) {
          case "borrows":
            redeemTokens = new NumberV(0);
            borrowAmount = amount;
            break;
          case "redeems":
            redeemTokens = amount;
            borrowAmount = new NumberV(0);
            break;
          default:
            throw new Error(`Unknown hypothetical: ${action.val}`);
        }

        return await getHypotheticalLiquidity(world, controller, account.val, vToken._address, redeemTokens.encode(), borrowAmount.encode());
      }
    ),
    new Fetcher<{controller: Controller}, AddressV>(`
        #### Admin

        * "Controller Admin" - Returns the Controllers's admin
          * E.g. "Controller Admin"
      `,
      "Admin",
      [new Arg("controller", getController, {implicit: true})],
      (world, {controller}) => getAdmin(world, controller)
    ),
    new Fetcher<{controller: Controller}, AddressV>(`
        #### PendingAdmin

        * "Controller PendingAdmin" - Returns the pending admin of the Controller
          * E.g. "Controller PendingAdmin" - Returns Controller's pending admin
      `,
      "PendingAdmin",
      [
        new Arg("controller", getController, {implicit: true}),
      ],
      (world, {controller}) => getPendingAdmin(world, controller)
    ),
    new Fetcher<{controller: Controller}, AddressV>(`
        #### PriceOracle

        * "Controller PriceOracle" - Returns the Controllers's price oracle
          * E.g. "Controller PriceOracle"
      `,
      "PriceOracle",
      [new Arg("controller", getController, {implicit: true})],
      (world, {controller}) => getPriceOracle(world, controller)
    ),
    new Fetcher<{controller: Controller}, NumberV>(`
        #### CloseFactor

        * "Controller CloseFactor" - Returns the Controllers's price oracle
          * E.g. "Controller CloseFactor"
      `,
      "CloseFactor",
      [new Arg("controller", getController, {implicit: true})],
      (world, {controller}) => getCloseFactor(world, controller)
    ),
    new Fetcher<{controller: Controller}, NumberV>(`
        #### MaxAssets

        * "Controller MaxAssets" - Returns the Controllers's price oracle
          * E.g. "Controller MaxAssets"
      `,
      "MaxAssets",
      [new Arg("controller", getController, {implicit: true})],
      (world, {controller}) => getMaxAssets(world, controller)
    ),
    new Fetcher<{controller: Controller}, NumberV>(`
        #### LiquidationIncentive

        * "Controller LiquidationIncentive" - Returns the Controllers's liquidation incentive
          * E.g. "Controller LiquidationIncentive"
      `,
      "LiquidationIncentive",
      [new Arg("controller", getController, {implicit: true})],
      (world, {controller}) => getLiquidationIncentive(world, controller)
    ),
    new Fetcher<{controller: Controller}, AddressV>(`
        #### Implementation

        * "Controller Implementation" - Returns the Controllers's implementation
          * E.g. "Controller Implementation"
      `,
      "Implementation",
      [new Arg("controller", getController, {implicit: true})],
      (world, {controller}) => getImplementation(world, controller)
    ),
    new Fetcher<{controller: Controller}, NumberV>(`
        #### BlockNumber

        * "Controller BlockNumber" - Returns the Controllers's mocked block number (for scenario runner)
          * E.g. "Controller BlockNumber"
      `,
      "BlockNumber",
      [new Arg("controller", getController, {implicit: true})],
      (world, {controller}) => getBlockNumber(world, controller)
    ),
    new Fetcher<{controller: Controller, vToken: VToken}, NumberV>(`
        #### CollateralFactor

        * "Controller CollateralFactor <VToken>" - Returns the collateralFactor associated with a given asset
          * E.g. "Controller CollateralFactor cZRX"
      `,
      "CollateralFactor",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("vToken", getVTokenV)
      ],
      (world, {controller, vToken}) => getCollateralFactor(world, controller, vToken)
    ),
    new Fetcher<{controller: Controller, account: AddressV}, NumberV>(`
        #### MembershipLength

        * "Controller MembershipLength <User>" - Returns a given user's length of membership
          * E.g. "Controller MembershipLength Geoff"
      `,
      "MembershipLength",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("account", getAddressV)
      ],
      (world, {controller, account}) => membershipLength(world, controller, account.val)
    ),
    new Fetcher<{controller: Controller, account: AddressV, vToken: VToken}, BoolV>(`
        #### CheckMembership

        * "Controller CheckMembership <User> <VToken>" - Returns one if user is in asset, zero otherwise.
          * E.g. "Controller CheckMembership Geoff cZRX"
      `,
      "CheckMembership",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("account", getAddressV),
        new Arg("vToken", getVTokenV)
      ],
      (world, {controller, account, vToken}) => checkMembership(world, controller, account.val, vToken)
    ),
    new Fetcher<{controller: Controller, account: AddressV}, ListV>(`
        #### AssetsIn

        * "Controller AssetsIn <User>" - Returns the assets a user is in
          * E.g. "Controller AssetsIn Geoff"
      `,
      "AssetsIn",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("account", getAddressV)
      ],
      (world, {controller, account}) => getAssetsIn(world, controller, account.val)
    ),
    new Fetcher<{controller: Controller, vToken: VToken}, BoolV>(`
        #### CheckListed

        * "Controller CheckListed <VToken>" - Returns true if market is listed, false otherwise.
          * E.g. "Controller CheckListed cZRX"
      `,
      "CheckListed",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("vToken", getVTokenV)
      ],
      (world, {controller, vToken}) => checkListed(world, controller, vToken)
    ),
    new Fetcher<{controller: Controller, vToken: VToken}, BoolV>(`
        #### CheckIsVtxed

        * "Controller CheckIsVtxed <VToken>" - Returns true if market is listed, false otherwise.
          * E.g. "Controller CheckIsVtxed cZRX"
      `,
      "CheckIsVtxed",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("vToken", getVTokenV)
      ],
      (world, {controller, vToken}) => checkIsVtxed(world, controller, vToken)
    ),
    new Fetcher<{controller: Controller}, AddressV>(`
        #### PauseGuardian

        * "PauseGuardian" - Returns the Controllers's PauseGuardian
        * E.g. "Controller PauseGuardian"
        `,
        "PauseGuardian",
        [
          new Arg("controller", getController, {implicit: true})
        ],
        async (world, {controller}) => new AddressV(await controller.methods.pauseGuardian().call())
    ),

    new Fetcher<{controller: Controller}, BoolV>(`
        #### _MintGuardianPaused

        * "_MintGuardianPaused" - Returns the Controllers's original global Mint paused status
        * E.g. "Controller _MintGuardianPaused"
        `,
        "_MintGuardianPaused",
        [new Arg("controller", getController, {implicit: true})],
        async (world, {controller}) => new BoolV(await controller.methods._mintGuardianPaused().call())
    ),
    new Fetcher<{controller: Controller}, BoolV>(`
        #### _BorrowGuardianPaused

        * "_BorrowGuardianPaused" - Returns the Controllers's original global Borrow paused status
        * E.g. "Controller _BorrowGuardianPaused"
        `,
        "_BorrowGuardianPaused",
        [new Arg("controller", getController, {implicit: true})],
        async (world, {controller}) => new BoolV(await controller.methods._borrowGuardianPaused().call())
    ),

    new Fetcher<{controller: Controller}, BoolV>(`
        #### TransferGuardianPaused

        * "TransferGuardianPaused" - Returns the Controllers's Transfer paused status
        * E.g. "Controller TransferGuardianPaused"
        `,
        "TransferGuardianPaused",
        [new Arg("controller", getController, {implicit: true})],
        async (world, {controller}) => new BoolV(await controller.methods.transferGuardianPaused().call())
    ),
    new Fetcher<{controller: Controller}, BoolV>(`
        #### SeizeGuardianPaused

        * "SeizeGuardianPaused" - Returns the Controllers's Seize paused status
        * E.g. "Controller SeizeGuardianPaused"
        `,
        "SeizeGuardianPaused",
        [new Arg("controller", getController, {implicit: true})],
        async (world, {controller}) => new BoolV(await controller.methods.seizeGuardianPaused().call())
    ),

    new Fetcher<{controller: Controller, vToken: VToken}, BoolV>(`
        #### MintGuardianMarketPaused

        * "MintGuardianMarketPaused" - Returns the Controllers's Mint paused status in market
        * E.g. "Controller MintGuardianMarketPaused cREP"
        `,
        "MintGuardianMarketPaused",
        [
          new Arg("controller", getController, {implicit: true}),
          new Arg("vToken", getVTokenV)
        ],
        async (world, {controller, vToken}) => new BoolV(await controller.methods.mintGuardianPaused(vToken._address).call())
    ),
    new Fetcher<{controller: Controller, vToken: VToken}, BoolV>(`
        #### BorrowGuardianMarketPaused

        * "BorrowGuardianMarketPaused" - Returns the Controllers's Borrow paused status in market
        * E.g. "Controller BorrowGuardianMarketPaused cREP"
        `,
        "BorrowGuardianMarketPaused",
        [
          new Arg("controller", getController, {implicit: true}),
          new Arg("vToken", getVTokenV)
        ],
        async (world, {controller, vToken}) => new BoolV(await controller.methods.borrowGuardianPaused(vToken._address).call())
    ),

    new Fetcher<{controller: Controller}, ListV>(`
      #### GetVtxMarkets

      * "GetVtxMarkets" - Returns an array of the currently enabled Vtx markets. To use the auto-gen array getter vtxMarkets(uint), use VtxMarkets
      * E.g. "Controller GetVtxMarkets"
      `,
      "GetVtxMarkets",
      [new Arg("controller", getController, {implicit: true})],
      async(world, {controller}) => await getVtxMarkets(world, controller)
     ),

    new Fetcher<{controller: Controller}, NumberV>(`
      #### VtxRate

      * "VtxRate" - Returns the current vtx rate.
      * E.g. "Controller VtxRate"
      `,
      "VtxRate",
      [new Arg("controller", getController, {implicit: true})],
      async(world, {controller}) => new NumberV(await controller.methods.vtxRate().call())
    ),

    new Fetcher<{controller: Controller, signature: StringV, callArgs: StringV[]}, NumberV>(`
        #### CallNum

        * "CallNum signature:<String> ...callArgs<CoreValue>" - Simple direct call method
          * E.g. "Controller CallNum \"vtxSpeeds(address)\" (Address Coburn)"
      `,
      "CallNum",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("signature", getStringV),
        new Arg("callArgs", getCoreValue, {variadic: true, mapped: true})
      ],
      async (world, {controller, signature, callArgs}) => {
        const fnData = encodeABI(world, signature.val, callArgs.map(a => a.val));
        const res = await world.web3.eth.call({
            to: controller._address,
            data: fnData
          })
        const resNum : any = world.web3.eth.abi.decodeParameter('uint256',res);
        return new NumberV(resNum);
      }
    ),
    new Fetcher<{controller: Controller, VToken: VToken, key: StringV}, NumberV>(`
        #### VtxSupplyState(address)

        * "Controller VtxBorrowState cZRX "index"
      `,
      "VtxSupplyState",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("VToken", getVTokenV),
        new Arg("key", getStringV),
      ],
      async (world, {controller, VToken, key}) => {
        const result = await controller.methods.vtxSupplyState(VToken._address).call();
        return new NumberV(result[key.val]);
      }
    ),
    new Fetcher<{controller: Controller, VToken: VToken, key: StringV}, NumberV>(`
        #### VtxBorrowState(address)

        * "Controller VtxBorrowState cZRX "index"
      `,
      "VtxBorrowState",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("VToken", getVTokenV),
        new Arg("key", getStringV),
      ],
      async (world, {controller, VToken, key}) => {
        const result = await controller.methods.vtxBorrowState(VToken._address).call();
        return new NumberV(result[key.val]);
      }
    ),
    new Fetcher<{controller: Controller, account: AddressV, key: StringV}, NumberV>(`
        #### VtxAccrued(address)

        * "Controller VtxAccrued Coburn
      `,
      "VtxAccrued",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("account", getAddressV),
      ],
      async (world, {controller,account}) => {
        const result = await controller.methods.vtxAccrued(account.val).call();
        return new NumberV(result);
      }
    ),
    new Fetcher<{controller: Controller, VToken: VToken, account: AddressV}, NumberV>(`
        #### vtxSupplierIndex

        * "Controller VtxSupplierIndex cZRX Coburn
      `,
      "VtxSupplierIndex",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("VToken", getVTokenV),
        new Arg("account", getAddressV),
      ],
      async (world, {controller, VToken, account}) => {
        return new NumberV(await controller.methods.vtxSupplierIndex(VToken._address, account.val).call());
      }
    ),
    new Fetcher<{controller: Controller, VToken: VToken, account: AddressV}, NumberV>(`
        #### VtxBorrowerIndex

        * "Controller VtxBorrowerIndex cZRX Coburn
      `,
      "VtxBorrowerIndex",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("VToken", getVTokenV),
        new Arg("account", getAddressV),
      ],
      async (world, {controller, VToken, account}) => {
        return new NumberV(await controller.methods.vtxBorrowerIndex(VToken._address, account.val).call());
      }
    ),
    new Fetcher<{controller: Controller, VToken: VToken}, NumberV>(`
        #### VtxSpeed

        * "Controller VtxSpeed cZRX
      `,
      "VtxSpeed",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("VToken", getVTokenV),
      ],
      async (world, {controller, VToken}) => {
        return new NumberV(await controller.methods.vtxSpeeds(VToken._address).call());
      }
    ),
    new Fetcher<{controller: Controller}, AddressV>(`
        #### BorrowCapGuardian

        * "BorrowCapGuardian" - Returns the Controllers's BorrowCapGuardian
        * E.g. "Controller BorrowCapGuardian"
        `,
        "BorrowCapGuardian",
        [
          new Arg("controller", getController, {implicit: true})
        ],
        async (world, {controller}) => new AddressV(await controller.methods.borrowCapGuardian().call())
    ),
    new Fetcher<{controller: Controller, VToken: VToken}, NumberV>(`
        #### BorrowCaps

        * "Controller BorrowCaps cZRX
      `,
      "BorrowCaps",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("VToken", getVTokenV),
      ],
      async (world, {controller, VToken}) => {
        return new NumberV(await controller.methods.borrowCaps(VToken._address).call());
      }
    )
  ];
}

export async function getControllerValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>("Controller", controllerFetchers(), world, event);
}
