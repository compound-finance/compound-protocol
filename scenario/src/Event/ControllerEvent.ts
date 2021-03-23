import {Event} from '../Event';
import {addAction, describeUser, World} from '../World';
import {decodeCall, getPastEvents} from '../Contract';
import {Controller} from '../Contract/Controller';
import {ControllerImpl} from '../Contract/ControllerImpl';
import {VToken} from '../Contract/VToken';
import {invoke} from '../Invokation';
import {
  getAddressV,
  getBoolV,
  getEventV,
  getExpNumberV,
  getNumberV,
  getPercentV,
  getStringV,
  getCoreValue
} from '../CoreValue';
import {
  AddressV,
  BoolV,
  EventV,
  NumberV,
  StringV
} from '../Value';
import {Arg, Command, View, processCommandEvent} from '../Command';
import {buildControllerImpl} from '../Builder/ControllerImplBuilder';
import {ControllerErrorReporter} from '../ErrorReporter';
import {getController, getControllerImpl} from '../ContractLookup';
import {getLiquidity} from '../Value/ControllerValue';
import {getVTokenV} from '../Value/VTokenValue';
import {encodedNumber} from '../Encoding';
import {encodeABI, rawValues} from "../Utils";

async function genController(world: World, from: string, params: Event): Promise<World> {
  let {world: nextWorld, controllerImpl: controller, controllerImplData: controllerData} = await buildControllerImpl(world, from, params);
  world = nextWorld;

  world = addAction(
    world,
    `Added Controller (${controllerData.description}) at address ${controller._address}`,
    controllerData.invokation
  );

  return world;
};

async function setPaused(world: World, from: string, controller: Controller, actionName: string, isPaused: boolean): Promise<World> {
  const pauseMap = {
    "Mint": controller.methods._setMintPaused
  };

  if (!pauseMap[actionName]) {
    throw `Cannot find pause function for action "${actionName}"`;
  }

  let invokation = await invoke(world, controller[actionName]([isPaused]), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Controller: set paused for ${actionName} to ${isPaused}`,
    invokation
  );

  return world;
}

async function setMaxAssets(world: World, from: string, controller: Controller, numberOfAssets: NumberV): Promise<World> {
  let invokation = await invoke(world, controller.methods._setMaxAssets(numberOfAssets.encode()), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Set max assets to ${numberOfAssets.show()}`,
    invokation
  );

  return world;
}

async function setLiquidationIncentive(world: World, from: string, controller: Controller, liquidationIncentive: NumberV): Promise<World> {
  let invokation = await invoke(world, controller.methods._setLiquidationIncentive(liquidationIncentive.encode()), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Set liquidation incentive to ${liquidationIncentive.show()}`,
    invokation
  );

  return world;
}

async function supportMarket(world: World, from: string, controller: Controller, vToken: VToken): Promise<World> {
  if (world.dryRun) {
    // Skip this specifically on dry runs since it's likely to crash due to a number of reasons
    world.printer.printLine(`Dry run: Supporting market  \`${vToken._address}\``);
    return world;
  }

  let invokation = await invoke(world, controller.methods._supportMarket(vToken._address), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Supported market ${vToken.name}`,
    invokation
  );

  return world;
}

async function unlistMarket(world: World, from: string, controller: Controller, vToken: VToken): Promise<World> {
  let invokation = await invoke(world, controller.methods.unlist(vToken._address), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Unlisted market ${vToken.name}`,
    invokation
  );

  return world;
}

async function enterMarkets(world: World, from: string, controller: Controller, assets: string[]): Promise<World> {
  let invokation = await invoke(world, controller.methods.enterMarkets(assets), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Called enter assets ${assets} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function exitMarket(world: World, from: string, controller: Controller, asset: string): Promise<World> {
  let invokation = await invoke(world, controller.methods.exitMarket(asset), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Called exit market ${asset} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function setPriceOracle(world: World, from: string, controller: Controller, priceOracleAddr: string): Promise<World> {
  let invokation = await invoke(world, controller.methods._setPriceOracle(priceOracleAddr), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Set price oracle for to ${priceOracleAddr} as ${describeUser(world, from)}`,
    invokation
  );

  return world;
}

async function setCollateralFactor(world: World, from: string, controller: Controller, vToken: VToken, collateralFactor: NumberV): Promise<World> {
  let invokation = await invoke(world, controller.methods._setCollateralFactor(vToken._address, collateralFactor.encode()), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Set collateral factor for ${vToken.name} to ${collateralFactor.show()}`,
    invokation
  );

  return world;
}

async function setCloseFactor(world: World, from: string, controller: Controller, closeFactor: NumberV): Promise<World> {
  let invokation = await invoke(world, controller.methods._setCloseFactor(closeFactor.encode()), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Set close factor to ${closeFactor.show()}`,
    invokation
  );

  return world;
}

async function fastForward(world: World, from: string, controller: Controller, blocks: NumberV): Promise<World> {
  let invokation = await invoke(world, controller.methods.fastForward(blocks.encode()), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Fast forward ${blocks.show()} blocks to #${invokation.value}`,
    invokation
  );

  return world;
}

async function sendAny(world: World, from:string, controller: Controller, signature: string, callArgs: string[]): Promise<World> {
  const fnData = encodeABI(world, signature, callArgs);
  await world.web3.eth.sendTransaction({
      to: controller._address,
      data: fnData,
      from: from
    })
  return world;
}

async function addVtxMarkets(world: World, from: string, controller: Controller, vTokens: VToken[]): Promise<World> {
  let invokation = await invoke(world, controller.methods._addVtxMarkets(vTokens.map(c => c._address)), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Added VTX markets ${vTokens.map(c => c.name)}`,
    invokation
  );

  return world;
}

async function dropVtxMarket(world: World, from: string, controller: Controller, vToken: VToken): Promise<World> {
  let invokation = await invoke(world, controller.methods._dropVtxMarket(vToken._address), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Drop VTX market ${vToken.name}`,
    invokation
  );

  return world;
}

async function refreshVtxSpeeds(world: World, from: string, controller: Controller): Promise<World> {
  let invokation = await invoke(world, controller.methods.refreshVtxSpeeds(), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Refreshed VTX speeds`,
    invokation
  );

  return world;
}

async function claimVtx(world: World, from: string, controller: Controller, holder: string): Promise<World> {
  let invokation = await invoke(world, controller.methods.claimVtx(holder), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Vtx claimed by ${holder}`,
    invokation
  );

  return world;
}

async function updateContributorRewards(world: World, from: string, controller: Controller, contributor: string): Promise<World> {
  let invokation = await invoke(world, controller.methods.updateContributorRewards(contributor), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Contributor rewards updated for ${contributor}`,
    invokation
  );

  return world;
}

async function grantVtx(world: World, from: string, controller: Controller, recipient: string, amount: NumberV): Promise<World> {
  let invokation = await invoke(world, controller.methods._grantVtx(recipient, amount.encode()), from, ControllerErrorReporter);

  world = addAction(
    world,
    `${amount.show()} vtx granted to ${recipient}`,
    invokation
  );

  return world;
}

async function setVtxRate(world: World, from: string, controller: Controller, rate: NumberV): Promise<World> {
  let invokation = await invoke(world, controller.methods._setVtxRate(rate.encode()), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Vtx rate set to ${rate.show()}`,
    invokation
  );

  return world;
}

async function setVtxSpeed(world: World, from: string, controller: Controller, vToken: VToken, speed: NumberV): Promise<World> {
  let invokation = await invoke(world, controller.methods._setVtxSpeed(vToken._address, speed.encode()), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Vtx speed for market ${vToken._address} set to ${speed.show()}`,
    invokation
  );

  return world;
}

async function setContributorVtxSpeed(world: World, from: string, controller: Controller, contributor: string, speed: NumberV): Promise<World> {
  let invokation = await invoke(world, controller.methods._setContributorVtxSpeed(contributor, speed.encode()), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Vtx speed for contributor ${contributor} set to ${speed.show()}`,
    invokation
  );

  return world;
}

async function printLiquidity(world: World, controller: Controller): Promise<World> {
  let enterEvents = await getPastEvents(world, controller, 'StdController', 'MarketEntered');
  let addresses = enterEvents.map((event) => event.returnValues['account']);
  let uniq = [...new Set(addresses)];

  world.printer.printLine("Liquidity:")

  const liquidityMap = await Promise.all(uniq.map(async (address) => {
    let userLiquidity = await getLiquidity(world, controller, address);

    return [address, userLiquidity.val];
  }));

  liquidityMap.forEach(([address, liquidity]) => {
    world.printer.printLine(`\t${world.settings.lookupAlias(address)}: ${liquidity / 1e18}e18`)
  });

  return world;
}

async function setPendingAdmin(world: World, from: string, controller: Controller, newPendingAdmin: string): Promise<World> {
  let invokation = await invoke(world, controller.methods._setPendingAdmin(newPendingAdmin), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Controller: ${describeUser(world, from)} sets pending admin to ${newPendingAdmin}`,
    invokation
  );

  return world;
}

async function acceptAdmin(world: World, from: string, controller: Controller): Promise<World> {
  let invokation = await invoke(world, controller.methods._acceptAdmin(), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Controller: ${describeUser(world, from)} accepts admin`,
    invokation
  );

  return world;
}

async function setPauseGuardian(world: World, from: string, controller: Controller, newPauseGuardian: string): Promise<World> {
  let invokation = await invoke(world, controller.methods._setPauseGuardian(newPauseGuardian), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Controller: ${describeUser(world, from)} sets pause guardian to ${newPauseGuardian}`,
    invokation
  );

  return world;
}

async function setGuardianPaused(world: World, from: string, controller: Controller, action: string, state: boolean): Promise<World> {
  let fun;
  switch(action){
    case "Transfer":
      fun = controller.methods._setTransferPaused
      break;
    case "Seize":
      fun = controller.methods._setSeizePaused
      break;
  }
  let invokation = await invoke(world, fun(state), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Controller: ${describeUser(world, from)} sets ${action} paused`,
    invokation
  );

  return world;
}

async function setGuardianMarketPaused(world: World, from: string, controller: Controller, vToken: VToken, action: string, state: boolean): Promise<World> {
  let fun;
  switch(action){
    case "Mint":
      fun = controller.methods._setMintPaused
      break;
    case "Borrow":
      fun = controller.methods._setBorrowPaused
      break;
  }
  let invokation = await invoke(world, fun(vToken._address, state), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Controller: ${describeUser(world, from)} sets ${action} paused`,
    invokation
  );

  return world;
}

async function setMarketBorrowCaps(world: World, from: string, controller: Controller, vTokens: VToken[], borrowCaps: NumberV[]): Promise<World> {
  let invokation = await invoke(world, controller.methods._setMarketBorrowCaps(vTokens.map(c => c._address), borrowCaps.map(c => c.encode())), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Borrow caps on ${vTokens} set to ${borrowCaps}`,
    invokation
  );

  return world;
}

async function setBorrowCapGuardian(world: World, from: string, controller: Controller, newBorrowCapGuardian: string): Promise<World> {
  let invokation = await invoke(world, controller.methods._setBorrowCapGuardian(newBorrowCapGuardian), from, ControllerErrorReporter);

  world = addAction(
    world,
    `Controller: ${describeUser(world, from)} sets borrow cap guardian to ${newBorrowCapGuardian}`,
    invokation
  );

  return world;
}

export function controllerCommands() {
  return [
    new Command<{controllerParams: EventV}>(`
        #### Deploy

        * "Controller Deploy ...controllerParams" - Generates a new Controller (not as Impl)
          * E.g. "Controller Deploy YesNo"
      `,
      "Deploy",
      [new Arg("controllerParams", getEventV, {variadic: true})],
      (world, from, {controllerParams}) => genController(world, from, controllerParams.val)
    ),
    new Command<{controller: Controller, action: StringV, isPaused: BoolV}>(`
        #### SetPaused

        * "Controller SetPaused <Action> <Bool>" - Pauses or unpaused given vToken function
          * E.g. "Controller SetPaused "Mint" True"
      `,
      "SetPaused",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("action", getStringV),
        new Arg("isPaused", getBoolV)
      ],
      (world, from, {controller, action, isPaused}) => setPaused(world, from, controller, action.val, isPaused.val)
    ),
    new Command<{controller: Controller, vToken: VToken}>(`
        #### SupportMarket

        * "Controller SupportMarket <VToken>" - Adds support in the Controller for the given vToken
          * E.g. "Controller SupportMarket cZRX"
      `,
      "SupportMarket",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("vToken", getVTokenV)
      ],
      (world, from, {controller, vToken}) => supportMarket(world, from, controller, vToken)
    ),
    new Command<{controller: Controller, vToken: VToken}>(`
        #### UnList

        * "Controller UnList <VToken>" - Mock unlists a given market in tests
          * E.g. "Controller UnList cZRX"
      `,
      "UnList",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("vToken", getVTokenV)
      ],
      (world, from, {controller, vToken}) => unlistMarket(world, from, controller, vToken)
    ),
    new Command<{controller: Controller, vTokens: VToken[]}>(`
        #### EnterMarkets

        * "Controller EnterMarkets (<VToken> ...)" - User enters the given markets
          * E.g. "Controller EnterMarkets (cZRX vETH)"
      `,
      "EnterMarkets",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("vTokens", getVTokenV, {mapped: true})
      ],
      (world, from, {controller, vTokens}) => enterMarkets(world, from, controller, vTokens.map((c) => c._address))
    ),
    new Command<{controller: Controller, vToken: VToken}>(`
        #### ExitMarket

        * "Controller ExitMarket <VToken>" - User exits the given markets
          * E.g. "Controller ExitMarket cZRX"
      `,
      "ExitMarket",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("vToken", getVTokenV)
      ],
      (world, from, {controller, vToken}) => exitMarket(world, from, controller, vToken._address)
    ),
    new Command<{controller: Controller, maxAssets: NumberV}>(`
        #### SetMaxAssets

        * "Controller SetMaxAssets <Number>" - Sets (or resets) the max allowed asset count
          * E.g. "Controller SetMaxAssets 4"
      `,
      "SetMaxAssets",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("maxAssets", getNumberV)
      ],
      (world, from, {controller, maxAssets}) => setMaxAssets(world, from, controller, maxAssets)
    ),
    new Command<{controller: Controller, liquidationIncentive: NumberV}>(`
        #### LiquidationIncentive

        * "Controller LiquidationIncentive <Number>" - Sets the liquidation incentive
          * E.g. "Controller LiquidationIncentive 1.1"
      `,
      "LiquidationIncentive",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("liquidationIncentive", getExpNumberV)
      ],
      (world, from, {controller, liquidationIncentive}) => setLiquidationIncentive(world, from, controller, liquidationIncentive)
    ),
    new Command<{controller: Controller, priceOracle: AddressV}>(`
        #### SetPriceOracle

        * "Controller SetPriceOracle oracle:<Address>" - Sets the price oracle address
          * E.g. "Controller SetPriceOracle 0x..."
      `,
      "SetPriceOracle",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("priceOracle", getAddressV)
      ],
      (world, from, {controller, priceOracle}) => setPriceOracle(world, from, controller, priceOracle.val)
    ),
    new Command<{controller: Controller, vToken: VToken, collateralFactor: NumberV}>(`
        #### SetCollateralFactor

        * "Controller SetCollateralFactor <VToken> <Number>" - Sets the collateral factor for given vToken to number
          * E.g. "Controller SetCollateralFactor cZRX 0.1"
      `,
      "SetCollateralFactor",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("vToken", getVTokenV),
        new Arg("collateralFactor", getExpNumberV)
      ],
      (world, from, {controller, vToken, collateralFactor}) => setCollateralFactor(world, from, controller, vToken, collateralFactor)
    ),
    new Command<{controller: Controller, closeFactor: NumberV}>(`
        #### SetCloseFactor

        * "Controller SetCloseFactor <Number>" - Sets the close factor to given percentage
          * E.g. "Controller SetCloseFactor 0.2"
      `,
      "SetCloseFactor",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("closeFactor", getPercentV)
      ],
      (world, from, {controller, closeFactor}) => setCloseFactor(world, from, controller, closeFactor)
    ),
    new Command<{controller: Controller, newPendingAdmin: AddressV}>(`
        #### SetPendingAdmin

        * "Controller SetPendingAdmin newPendingAdmin:<Address>" - Sets the pending admin for the Controller
          * E.g. "Controller SetPendingAdmin Geoff"
      `,
      "SetPendingAdmin",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("newPendingAdmin", getAddressV)
      ],
      (world, from, {controller, newPendingAdmin}) => setPendingAdmin(world, from, controller, newPendingAdmin.val)
    ),
    new Command<{controller: Controller}>(`
        #### AcceptAdmin

        * "Controller AcceptAdmin" - Accepts admin for the Controller
          * E.g. "From Geoff (Controller AcceptAdmin)"
      `,
      "AcceptAdmin",
      [
        new Arg("controller", getController, {implicit: true}),
      ],
      (world, from, {controller}) => acceptAdmin(world, from, controller)
    ),
    new Command<{controller: Controller, newPauseGuardian: AddressV}>(`
        #### SetPauseGuardian

        * "Controller SetPauseGuardian newPauseGuardian:<Address>" - Sets the PauseGuardian for the Controller
          * E.g. "Controller SetPauseGuardian Geoff"
      `,
      "SetPauseGuardian",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("newPauseGuardian", getAddressV)
      ],
      (world, from, {controller, newPauseGuardian}) => setPauseGuardian(world, from, controller, newPauseGuardian.val)
    ),

    new Command<{controller: Controller, action: StringV, isPaused: BoolV}>(`
        #### SetGuardianPaused

        * "Controller SetGuardianPaused <Action> <Bool>" - Pauses or unpaused given vToken function
        * E.g. "Controller SetGuardianPaused "Transfer" True"
        `,
        "SetGuardianPaused",
        [
          new Arg("controller", getController, {implicit: true}),
          new Arg("action", getStringV),
          new Arg("isPaused", getBoolV)
        ],
        (world, from, {controller, action, isPaused}) => setGuardianPaused(world, from, controller, action.val, isPaused.val)
    ),

    new Command<{controller: Controller, vToken: VToken, action: StringV, isPaused: BoolV}>(`
        #### SetGuardianMarketPaused

        * "Controller SetGuardianMarketPaused <VToken> <Action> <Bool>" - Pauses or unpaused given vToken function
        * E.g. "Controller SetGuardianMarketPaused cREP "Mint" True"
        `,
        "SetGuardianMarketPaused",
        [
          new Arg("controller", getController, {implicit: true}),
          new Arg("vToken", getVTokenV),
          new Arg("action", getStringV),
          new Arg("isPaused", getBoolV)
        ],
        (world, from, {controller, vToken, action, isPaused}) => setGuardianMarketPaused(world, from, controller, vToken, action.val, isPaused.val)
    ),

    new Command<{controller: Controller, blocks: NumberV, _keyword: StringV}>(`
        #### FastForward

        * "FastForward n:<Number> Blocks" - Moves the block number forward "n" blocks. Note: in "VTokenScenario" and "ControllerScenario" the current block number is mocked (starting at 100000). This is the only way for the protocol to see a higher block number (for accruing interest).
          * E.g. "Controller FastForward 5 Blocks" - Move block number forward 5 blocks.
      `,
      "FastForward",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("blocks", getNumberV),
        new Arg("_keyword", getStringV)
      ],
      (world, from, {controller, blocks}) => fastForward(world, from, controller, blocks)
    ),
    new View<{controller: Controller}>(`
        #### Liquidity

        * "Controller Liquidity" - Prints liquidity of all minters or borrowers
      `,
      "Liquidity",
      [
        new Arg("controller", getController, {implicit: true}),
      ],
      (world, {controller}) => printLiquidity(world, controller)
    ),
    new View<{controller: Controller, input: StringV}>(`
        #### Decode

        * "Decode input:<String>" - Prints information about a call to a Controller contract
      `,
      "Decode",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("input", getStringV)

      ],
      (world, {controller, input}) => decodeCall(world, controller, input.val)
    ),

    new Command<{controller: Controller, signature: StringV, callArgs: StringV[]}>(`
      #### Send
      * Controller Send functionSignature:<String> callArgs[] - Sends any transaction to controller
      * E.g: Controller Send "setVtxAddress(address)" (Address VTX)
      `,
      "Send",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("signature", getStringV),
        new Arg("callArgs", getCoreValue, {variadic: true, mapped: true})
      ],
      (world, from, {controller, signature, callArgs}) => sendAny(world, from, controller, signature.val, rawValues(callArgs))
    ),
    new Command<{controller: Controller, vTokens: VToken[]}>(`
      #### AddVtxMarkets

      * "Controller AddVtxMarkets (<Address> ...)" - Makes a market VTX-enabled
      * E.g. "Controller AddVtxMarkets (cZRX vBAT)
      `,
      "AddVtxMarkets",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("vTokens", getVTokenV, {mapped: true})
      ],
      (world, from, {controller, vTokens}) => addVtxMarkets(world, from, controller, vTokens)
     ),
    new Command<{controller: Controller, vToken: VToken}>(`
      #### DropVtxMarket

      * "Controller DropVtxMarket <Address>" - Makes a market VTX
      * E.g. "Controller DropVtxMarket cZRX
      `,
      "DropVtxMarket",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("vToken", getVTokenV)
      ],
      (world, from, {controller, vToken}) => dropVtxMarket(world, from, controller, vToken)
     ),

    new Command<{controller: Controller}>(`
      #### RefreshVtxSpeeds

      * "Controller RefreshVtxSpeeds" - Recalculates all the VTX market speeds
      * E.g. "Controller RefreshVtxSpeeds
      `,
      "RefreshVtxSpeeds",
      [
        new Arg("controller", getController, {implicit: true})
      ],
      (world, from, {controller}) => refreshVtxSpeeds(world, from, controller)
    ),
    new Command<{controller: Controller, holder: AddressV}>(`
      #### ClaimVtx

      * "Controller ClaimVtx <holder>" - Claims vtx
      * E.g. "Controller ClaimVtx Geoff
      `,
      "ClaimVtx",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("holder", getAddressV)
      ],
      (world, from, {controller, holder}) => claimVtx(world, from, controller, holder.val)
    ),
    new Command<{controller: Controller, contributor: AddressV}>(`
      #### UpdateContributorRewards

      * "Controller UpdateContributorRewards <contributor>" - Updates rewards for a contributor
      * E.g. "Controller UpdateContributorRewards Geoff
      `,
      "UpdateContributorRewards",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("contributor", getAddressV)
      ],
      (world, from, {controller, contributor}) => updateContributorRewards(world, from, controller, contributor.val)
    ),
    new Command<{controller: Controller, recipient: AddressV, amount: NumberV}>(`
      #### GrantVtx

      * "Controller GrantVtx <recipient> <amount>" - Grants VTX to a recipient
      * E.g. "Controller GrantVtx Geoff 1e18
      `,
      "GrantVtx",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("recipient", getAddressV),
        new Arg("amount", getNumberV)
      ],
      (world, from, {controller, recipient, amount}) => grantVtx(world, from, controller, recipient.val, amount)
    ),
    new Command<{controller: Controller, rate: NumberV}>(`
      #### SetVtxRate

      * "Controller SetVtxRate <rate>" - Sets VTX rate
      * E.g. "Controller SetVtxRate 1e18
      `,
      "SetVtxRate",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("rate", getNumberV)
      ],
      (world, from, {controller, rate}) => setVtxRate(world, from, controller, rate)
    ),
    new Command<{controller: Controller, vToken: VToken, speed: NumberV}>(`
      #### SetVtxSpeed
      * "Controller SetVtxSpeed <vToken> <rate>" - Sets VTX speed for market
      * E.g. "Controller SetVtxSpeed vToken 1000
      `,
      "SetVtxSpeed",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("vToken", getVTokenV),
        new Arg("speed", getNumberV)
      ],
      (world, from, {controller, vToken, speed}) => setVtxSpeed(world, from, controller, vToken, speed)
    ),
    new Command<{controller: Controller, contributor: AddressV, speed: NumberV}>(`
      #### SetContributorVtxSpeed
      * "Controller SetContributorVtxSpeed <contributor> <rate>" - Sets VTX speed for contributor
      * E.g. "Controller SetContributorVtxSpeed contributor 1000
      `,
      "SetContributorVtxSpeed",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("contributor", getAddressV),
        new Arg("speed", getNumberV)
      ],
      (world, from, {controller, contributor, speed}) => setContributorVtxSpeed(world, from, controller, contributor.val, speed)
    ),
    new Command<{controller: Controller, vTokens: VToken[], borrowCaps: NumberV[]}>(`
      #### SetMarketBorrowCaps

      * "Controller SetMarketBorrowCaps (<VToken> ...) (<borrowCap> ...)" - Sets Market Borrow Caps
      * E.g "Controller SetMarketBorrowCaps (cZRX cUSDC) (10000.0e18, 1000.0e6)
      `,
      "SetMarketBorrowCaps",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("vTokens", getVTokenV, {mapped: true}),
        new Arg("borrowCaps", getNumberV, {mapped: true})
      ],
      (world, from, {controller,vTokens,borrowCaps}) => setMarketBorrowCaps(world, from, controller, vTokens, borrowCaps)
    ),
    new Command<{controller: Controller, newBorrowCapGuardian: AddressV}>(`
        #### SetBorrowCapGuardian

        * "Controller SetBorrowCapGuardian newBorrowCapGuardian:<Address>" - Sets the Borrow Cap Guardian for the Controller
          * E.g. "Controller SetBorrowCapGuardian Geoff"
      `,
      "SetBorrowCapGuardian",
      [
        new Arg("controller", getController, {implicit: true}),
        new Arg("newBorrowCapGuardian", getAddressV)
      ],
      (world, from, {controller, newBorrowCapGuardian}) => setBorrowCapGuardian(world, from, controller, newBorrowCapGuardian.val)
    )
  ];
}

export async function processControllerEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("Controller", controllerCommands(), world, event, from);
}
