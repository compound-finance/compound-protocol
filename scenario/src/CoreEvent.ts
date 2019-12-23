import {
  addAction,
  checkExpectations,
  checkInvariants,
  clearInvariants,
  describeUser,
  holdInvariants,
  setEvent,
  World
} from './World';
import { Event } from './Event';
import { getAddressV, getEventV, getNumberV, getStringV } from './CoreValue';
import { AddressV, EventV, NothingV, NumberV, StringV, Value } from './Value';
import { Arg, Command, processCommandEvent, View } from './Command';
import { assertionCommands, processAssertionEvent } from './Event/AssertionEvent';
import { comptrollerCommands, processComptrollerEvent } from './Event/ComptrollerEvent';
import { processUnitrollerEvent, unitrollerCommands } from './Event/UnitrollerEvent';
import { comptrollerImplCommands, processComptrollerImplEvent } from './Event/ComptrollerImplEvent';
import { cTokenCommands, processCTokenEvent } from './Event/CTokenEvent';
import { cTokenDelegateCommands, processCTokenDelegateEvent } from './Event/CTokenDelegateEvent';
import { erc20Commands, processErc20Event } from './Event/Erc20Event';
import { interestRateModelCommands, processInterestRateModelEvent } from './Event/InterestRateModelEvent';
import { priceOracleCommands, processPriceOracleEvent } from './Event/PriceOracleEvent';
import { priceOracleProxyCommands, processPriceOracleProxyEvent } from './Event/PriceOracleProxyEvent';
import { maximillionCommands, processMaximillionEvent } from './Event/MaximillionEvent';
import { invariantCommands, processInvariantEvent } from './Event/InvariantEvent';
import { expectationCommands, processExpectationEvent } from './Event/ExpectationEvent';
import { timelockCommands, processTimelockEvent } from './Event/TimelockEvent';
import { processTrxEvent, trxCommands } from './Event/TrxEvent';
import { fetchers, getCoreValue } from './CoreValue';
import { formatEvent } from './Formatter';
import { fallback } from './Invokation';
import { sendRPC, sleep } from './Utils';
import { Map } from 'immutable';
import { encodedNumber } from './Encoding';
import { printHelp } from './Help';
import { loadContracts } from './Networks';
import { fork } from './Hypothetical';

export class EventProcessingError extends Error {
  error: Error;
  event: Event;

  constructor(error: Error, event: Event) {
    super(error.message);

    this.error = error;
    this.event = event;
    this.message = `Error: \`${this.error.toString()}\` when processing \`${formatEvent(this.event)}\``;
  }
}

export async function processEvents(originalWorld: World, events: Event[]): Promise<World> {
  return events.reduce(async (pWorld: Promise<World>, event: Event): Promise<World> => {
    let world = await pWorld;

    try {
      world = await processCoreEvent(setEvent(world, event), event, world.defaultFrom());
    } catch (err) {
      if (world.verbose) {
        console.error(err);
      }
      throw new EventProcessingError(err, event);
    }

    // Next, check any unchecked invariants
    world = await checkInvariants(world);

    // Check any expectations
    world = await checkExpectations(world);

    // Also clear trx related fields
    world = world.set('trxInvokationOpts', Map({}));
    world = world.set('newInvokation', false);

    if (!world) {
      throw new Error(`Encountered null world result when processing event ${event[0]}: ${world}`);
    } else if (!(world instanceof World)) {
      throw new Error(
        `Encountered world result which was not isWorld when processing event ${event[0]}: ${world}`
      );
    }

    return world;
  }, Promise.resolve(originalWorld));
}

async function print(world: World, message: string): Promise<World> {
  world.printer.printLine(message);

  return world;
}

async function inspect(world: World, string: string | null): Promise<World> {
  if (string !== null) {
    console.log(['Inspect', string, world.toJS()]);
  } else {
    console.log(['Inspect', world.toJS()]);
  }

  return world;
}

async function sendEther(world: World, from: string, to: string, amount: encodedNumber): Promise<World> {
  let invokation = await fallback(world, from, to, amount);

  world = addAction(world, `Send ${amount} from ${from} to ${to}`, invokation);

  return world;
}

export const commands = [
  new View<{ n: NumberV }>(
    `
      #### History

      * "History n:<Number>=5" - Prints history of actions
        * E.g. "History"
        * E.g. "History 10"
    `,
    'History',
    [new Arg('n', getNumberV, { default: new NumberV(5) })],
    async (world, { n }) => {
      world.actions.slice(0, Number(n.val)).forEach(action => {
        world.printer.printLine(action.toString());
      });

      return world;
    }
  ),
  new View<{ ms: NumberV }>(
    `
      #### Sleep

      * "Sleep ms:<Number>" - Sleeps for given amount of time.
        * E.g. "Sleep 1000" - Sleeps for one second
    `,
    'Sleep',
    [new Arg('ms', getNumberV)],
    async (world, { ms }) => {
      await sleep(ms.toNumber());
      return world;
    }
  ),
  new View<{ errMsg: StringV }>(
    `
      #### Throw

      * "Throw errMsg:<String>" - Throws given error
        * E.g. "Throw \"my error message\""
    `,
    'Throw',
    [new Arg('errMsg', getStringV)],
    async (world, { errMsg }) => {
      throw new Error(errMsg.val);

      return world;
    }
  ),
  new View<{ res: Value }>(
    `
      #### Read

      * "Read ..." - Reads given value and prints result
        * E.g. "Read CToken cBAT ExchangeRateStored" - Returns exchange rate of cBAT
    `,
    'Read',
    [new Arg('res', getCoreValue, { variadic: true })],
    async (world, { res }) => {
      world.printer.printValue(res);

      return world;
    },
    { subExpressions: fetchers }
  ),
  new View<{ message: StringV }>(
    `
      #### Print

      * "Print ..." - Prints given string
        * E.g. "Print \"Hello there\""
    `,
    'Print',
    [new Arg('message', getStringV)],
    async (world, { message }) => print(world, message.val)
  ),
  new View<{}>(
    `
      #### PrintTransactionLogs

      * "PrintTransactionLogs" - Prints logs from all transacions
    `,
    'PrintTransactionLogs',
    [],
    async (world, { }) => {
      return await world.updateSettings(async settings => {
        settings.printTxLogs = true;

        return settings;
      });
    }
  ),
  new View<{ url: StringV; unlockedAccounts: AddressV[] }>(
    `
      #### Web3Fork

      * "Web3Fork url:<String> unlockedAccounts:<String>[]" - Creates an in-memory ganache
        * E.g. "Web3Fork \"https://mainnet.infura.io/v3/e1a5d4d2c06a4e81945fca56d0d5d8ea\" (\"0x8b8592e9570e96166336603a1b4bd1e8db20fa20\")"
    `,
    'Web3Fork',
    [
      new Arg('url', getStringV),
      new Arg('unlockedAccounts', getAddressV, { mapped: true })
    ],
    async (world, { url, unlockedAccounts }) => fork(world, url.val, unlockedAccounts.map(v => v.val))
  ),

  new View<{ networkVal: StringV; }>(
    `
      #### UseConfigs

      * "UseConfigs networkVal:<String>" - Updates world to use the configs for specified network
        * E.g. "UseConfigs mainnet"
    `,
    'UseConfigs',
    [new Arg('networkVal', getStringV)],
    async (world, { networkVal }) => {
      const network = networkVal.val;
      if (world.basePath && (network === 'mainnet' || network === 'kovan' || network === 'goerli' || network === 'rinkeby')) {
        let newWorld = world.set('network', network);
        let contractInfo;
        [newWorld, contractInfo] = await loadContracts(newWorld);
        if (contractInfo.length > 0) {
          world.printer.printLine(`Contracts:`);
          contractInfo.forEach((info) => world.printer.printLine(`\t${info}`));
        }

        return newWorld;
      }

      return world;
    }
  ),

  new View<{ address: AddressV }>(
    `
      #### MyAddress

      * "MyAddress address:<String>" - Sets default from address (same as "Alias Me <addr>")
        * E.g. "MyAddress \"0x9C1856636d78C051deAd6CAB9c5699e4E25549e9\""
    `,
    'MyAddress',
    [new Arg('address', getAddressV)],
    async (world, { address }) => {
      return await world.updateSettings(async settings => {
        settings.aliases['Me'] = address.val;

        return settings;
      });
    }
  ),
  new View<{ name: StringV; address: AddressV }>(
    `
      #### Alias

      * "Alias name:<String> address:<String>" - Stores an alias between name and address
        * E.g. "Alias Me \"0x9C1856636d78C051deAd6CAB9c5699e4E25549e9\""
    `,
    'Alias',
    [new Arg('name', getStringV), new Arg('address', getAddressV)],
    async (world, { name, address }) => {
      return await world.updateSettings(async settings => {
        settings.aliases[name.val] = address.val;

        return settings;
      });
    }
  ),

  new View<{ name: StringV; address: AddressV }>(
    `
      #### Aliases

      * "Aliases - Prints all aliases
    `,
    'Aliases',
    [],
    async (world, { name, address }) => {
      world.printer.printLine('Aliases:');
      Object.entries(world.settings.aliases).forEach(([name, address]) => {
        world.printer.printLine(`\t${name}: ${address}`);
      });

      return world;
    }
  ),

  new View<{ seconds: NumberV }>(
    `
      #### IncreaseTime

      * "IncreaseTime seconds:<Number>" - Increase Ganache evm time by a number of seconds
        * E.g. "IncreaseTime 60"
    `,
    'IncreaseTime',
    [new Arg('seconds', getNumberV)],
    async (world, { seconds }) => {
      await sendRPC(world, 'evm_increaseTime', [Number(seconds.val)]);
      await sendRPC(world, 'evm_mine', []);
      return world;
    }
  ),

  new View<{ timestamp: NumberV }>(
    `
      #### SetTime

      * "SetTime timestamp:<Number>" - Increase Ganache evm time to specific timestamp
        * E.g. "SetTime 1573597400"
    `,
    'SetTime',
    [new Arg('timestamp', getNumberV)],
    async (world, { timestamp }) => {
      await sendRPC(world, 'evm_mine', [timestamp.val]);
      return world;
    }
  ),

  new View<{}>(
    `
      #### MineBlock

      * "MineBlock" - Increase Ganache evm block number
        * E.g. "MineBlock"
    `,
    'MineBlock',
    [],
    async (world, { }) => {
      await sendRPC(world, 'evm_mine', []);
      return world;
    }
  ),

  new View<{}>(
    `
      #### Inspect

      * "Inspect" - Prints debugging information about the world
    `,
    'Inspect',
    [],
    async (world, { }) => inspect(world, null)
  ),

  new View<{ message: StringV }>(
    `
      #### Debug

      * "Debug message:<String>" - Same as inspect but prepends with a string
    `,
    'Debug',
    [new Arg('message', getStringV)],
    async (world, { message }) => inspect(world, message.val)
  ),

  new View<{ account: AddressV; event: EventV }>(
    `
      #### From

      * "From <User> <Event>" - Runs event as the given user
        * E.g. "From Geoff (CToken cZRX Mint 5e18)"
    `,
    'From',
    [new Arg('account', getAddressV), new Arg('event', getEventV)],
    async (world, { account, event }) => processCoreEvent(world, event.val, account.val)
  ),

  new Command<{ event: EventV }>(
    `
      #### Trx

      * "Trx ...trxEvent" - Handles event to set details of next transaction
        * E.g. "Trx Value 1.0e18 (CToken cEth Mint 1.0e18)"
    `,
    'Trx',
    [new Arg('event', getEventV, { variadic: true })],
    async (world, from, { event }) => processTrxEvent(world, event.val, from),
    { subExpressions: trxCommands() }
  ),

  new Command<{ event: EventV }>(
    `
      #### Invariant

      * "Invariant ...invariant" - Adds a new invariant to the world which is checked after each transaction
        * E.g. "Invariant Static (CToken cZRX TotalSupply)"
    `,
    'Invariant',
    [new Arg('event', getEventV, { variadic: true })],
    async (world, from, { event }) => processInvariantEvent(world, event.val, from),
    { subExpressions: invariantCommands() }
  ),

  new Command<{ event: EventV }>(
    `
      #### Expect

      * "Expect ...expectation" - Adds an expectation to hold after the next transaction
        * E.g. "Expect Changes (CToken cZRX TotalSupply) +10.0e18"
    `,
    'Expect',
    [new Arg('event', getEventV, { variadic: true })],
    async (world, from, { event }) => processExpectationEvent(world, event.val, from),
    { subExpressions: expectationCommands() }
  ),

  new View<{ type: StringV }>(
    `
      #### HoldInvariants

      * "HoldInvariants type:<String>" - Skips checking invariants on next command.
        * E.g. "HoldInvariants" - Skips all invariants
        * E.g. "HoldInvariants All" - Skips all invariants
        * E.g. "HoldInvariants Success" - Skips "success" invariants
        * E.g. "HoldInvariants Remains" - Skips "remains" invariants
        * E.g. "HoldInvariants Static" - Skips "static" invariants
    `,
    'HoldInvariants',
    [new Arg('type', getStringV, { default: new StringV('All') })],
    async (world, { type }) => holdInvariants(world, type.val)
  ),

  new View<{ type: StringV }>(
    `
      #### ClearInvariants

      * "ClearInvariants type:<String>" - Removes all invariants.
        * E.g. "ClearInvariants" - Removes all invariants
        * E.g. "ClearInvariants All" - Removes all invariants
        * E.g. "ClearInvariants Success" - Removes "success" invariants
        * E.g. "ClearInvariants Remains" - Removes "remains" invariants
        * E.g. "ClearInvariants Static" - Removes "static" invariants
    `,
    'ClearInvariants',
    [new Arg('type', getStringV, { default: new StringV('All') })],
    async (world, { type }) => clearInvariants(world, type.val)
  ),

  new Command<{ event: EventV }>(
    `
      #### Assert

      * "Assert ...event" - Validates given assertion, raising an exception if assertion fails
        * E.g. "Assert Equal (Erc20 BAT TokenBalance Geoff) (Exactly 5.0)"
    `,
    'Assert',
    [new Arg('event', getEventV, { variadic: true })],
    async (world, from, { event }) => processAssertionEvent(world, event.val, from),
    { subExpressions: assertionCommands() }
  ),

  new Command<{ gate: Value; event: EventV }>(
    `
      #### Gate

      * "Gate value event" - Runs event only if value is falsey. Thus, gate can be used to build idempotency.
        * E.g. "Gate (Erc20 ZRX Address) (Erc20 Deploy BAT)"
    `,
    'Gate',
    [new Arg('gate', getCoreValue, { rescue: new NothingV() }), new Arg('event', getEventV)],
    async (world, from, { gate, event }) => {
      if (gate.truthy()) {
        return world;
      } else {
        return processCoreEvent(world, event.val, from);
      }
    }
  ),

  new Command<{ given: Value; event: EventV }>(
    `
      #### Given

      * "Given value event" - Runs event only if value is truthy. Thus, given can be used to build existence checks.
        * E.g. "Given ($var) (PriceOracle SetPrice cBAT $var)"
    `,
    'Given',
    [new Arg('given', getCoreValue, { rescue: new NothingV() }), new Arg('event', getEventV)],
    async (world, from, { given, event }) => {
      if (given.truthy()) {
        return processCoreEvent(world, event.val, from);
      } else {
        return world;
      }
    }
  ),

  new Command<{ address: AddressV; amount: NumberV }>(
    `
      #### Send

      * "Send <Address> <Amount>" - Sends a given amount of eth to given address
        * E.g. "Send cETH 0.5e18"
    `,
    'Send',
    [new Arg('address', getAddressV), new Arg('amount', getNumberV)],
    (world, from, { address, amount }) => sendEther(world, from, address.val, amount.encode())
  ),

  new Command<{ event: EventV }>(
    `
      #### Unitroller

      * "Unitroller ...event" - Runs given Unitroller event
        * E.g. "Unitroller SetPendingImpl MyComptrollerImpl"
    `,
    'Unitroller',
    [new Arg('event', getEventV, { variadic: true })],
    (world, from, { event }) => processUnitrollerEvent(world, event.val, from),
    { subExpressions: unitrollerCommands() }
  ),

  new Command<{ event: EventV }>(
    `
      #### Comptroller

      * "Comptroller ...event" - Runs given Comptroller event
        * E.g. "Comptroller _setReserveFactor 0.5"
    `,
    'Comptroller',
    [new Arg('event', getEventV, { variadic: true })],
    (world, from, { event }) => processComptrollerEvent(world, event.val, from),
    { subExpressions: comptrollerCommands() }
  ),

  new Command<{ event: EventV }>(
    `
      #### ComptrollerImpl

      * "ComptrollerImpl ...event" - Runs given ComptrollerImpl event
        * E.g. "ComptrollerImpl MyImpl Become"
    `,
    'ComptrollerImpl',
    [new Arg('event', getEventV, { variadic: true })],
    (world, from, { event }) => processComptrollerImplEvent(world, event.val, from),
    { subExpressions: comptrollerImplCommands() }
  ),

  new Command<{ event: EventV }>(
    `
      #### CToken

      * "CToken ...event" - Runs given CToken event
        * E.g. "CToken cZRX Mint 5e18"
    `,
    'CToken',
    [new Arg('event', getEventV, { variadic: true })],
    (world, from, { event }) => processCTokenEvent(world, event.val, from),
    { subExpressions: cTokenCommands() }
  ),

  new Command<{ event: EventV }>(
    `
      #### CTokenDelegate

      * "CTokenDelegate ...event" - Runs given CTokenDelegate event
        * E.g. "CTokenDelegate Deploy CDaiDelegate cDaiDelegate"
    `,
    'CTokenDelegate',
    [new Arg('event', getEventV, { variadic: true })],
    (world, from, { event }) => processCTokenDelegateEvent(world, event.val, from),
    { subExpressions: cTokenDelegateCommands() }
  ),

  new Command<{ event: EventV }>(
    `
      #### Erc20

      * "Erc20 ...event" - Runs given Erc20 event
        * E.g. "Erc20 ZRX Facuet Geoff 5e18"
    `,
    'Erc20',
    [new Arg('event', getEventV, { variadic: true })],
    (world, from, { event }) => processErc20Event(world, event.val, from),
    { subExpressions: erc20Commands() }
  ),

  new Command<{ event: EventV }>(
    `
      #### InterestRateModel

      * "InterestRateModel ...event" - Runs given interest rate model event
        * E.g. "InterestRateModel Deploy Fixed StdRate 0.5"
    `,
    'InterestRateModel',
    [new Arg('event', getEventV, { variadic: true })],
    (world, from, { event }) => processInterestRateModelEvent(world, event.val, from),
    { subExpressions: interestRateModelCommands() }
  ),

  new Command<{ event: EventV }>(
    `
      #### PriceOracle

      * "PriceOracle ...event" - Runs given Price Oracle event
        * E.g. "PriceOracle SetPrice cZRX 1.5"
    `,
    'PriceOracle',
    [new Arg('event', getEventV, { variadic: true })],
    (world, from, { event }) => processPriceOracleEvent(world, event.val, from),
    { subExpressions: priceOracleCommands() }
  ),

  new Command<{ event: EventV }>(
    `
      #### PriceOracleProxy

      * "PriceOracleProxy ...event" - Runs given Price Oracle event
      * E.g. "PriceOracleProxy Deploy (Unitroller Address) (PriceOracle Address) (CToken cETH Address)"
    `,
    'PriceOracleProxy',
    [new Arg('event', getEventV, { variadic: true })],
    (world, from, { event }) => {
      return processPriceOracleProxyEvent(world, event.val, from);
    },
    { subExpressions: priceOracleProxyCommands() }
  ),

  new Command<{ event: EventV }>(
    `
      #### Maximillion

      * "Maximillion ...event" - Runs given Maximillion event
      * E.g. "Maximillion Deploy (CToken cETH Address)"
    `,
    'Maximillion',
    [new Arg('event', getEventV, { variadic: true })],
    (world, from, { event }) => {
      return processMaximillionEvent(world, event.val, from);
    },
    { subExpressions: maximillionCommands() }
  ),

  new Command<{ event: EventV }>(
    `
      #### Timelock

      * "Timelock ...event" - Runs given Timelock event
      * E.g. "Timelock Deploy Geoff 604800"
    `,
    'Timelock',
    [new Arg('event', getEventV, { variadic: true })],
    (world, from, { event }) => {
      return processTimelockEvent(world, event.val, from);
    },
    { subExpressions: timelockCommands() }
  ),

  new View<{ event: EventV }>(
    `
      #### Help

      * "Help ...event" - Prints help for given command
      * E.g. "Help From"
    `,
    'Help',
    [new Arg('event', getEventV, { variadic: true })],
    async (world, { event }) => {
      world.printer.printLine('');
      printHelp(world.printer, event.val, commands);

      return world;
    }
  )
];

export async function processCoreEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>('Core', commands, world, event, from);
}
