import {Event} from '../Event';
import {fail, World} from '../World';
import {mustArray} from '../Utils';
import {getCoreValue} from '../CoreValue';
import {formatError} from '../Formatter';
import {Failure, Invokation, InvokationRevertFailure} from '../Invokation';
import {formatEvent} from '../Formatter';
import {
  getAddressV,
  getBoolV,
  getEventV,
  getMapV,
  getNumberV,
  getStringV
} from '../CoreValue';
import {
  AddressV,
  BoolV,
  EventV,
  MapV,
  NumberV,
  Order,
  StringV,
  Value
} from '../Value';
import {Arg, View, processCommandEvent} from '../Command';

async function assertApprox(world: World, given: NumberV, expected: NumberV, tolerance: NumberV): Promise<World> {
  if (Math.abs(Number(expected.sub(given).div(expected).val)) > Number(tolerance.val)) {
    return fail(world, `Expected ${given.toString()} to approximately equal ${expected.toString()} within ${tolerance.toString()}`);
  }

  return world;
}

async function assertEqual(world: World, given: Value, expected: Value): Promise<World> {
  if (!expected.compareTo(world, given)) {
    return fail(world, `Expected ${given.toString()} to equal ${expected.toString()}`);
  }

  return world;
}

async function assertLessThan(world: World, given: Value, expected: Value): Promise<World> {
  if (given.compareOrder(world, expected) !== Order.LESS_THAN) {
    return fail(world, `Expected ${given.toString()} to be less than ${expected.toString()}`);
  }

  return world;
}

async function assertFailure(world: World, failure: Failure): Promise<World> {
  if (!world.lastInvokation) {
    return fail(world, `Expected ${failure.toString()}, but missing any invokations.`);
  }

  if (world.lastInvokation.success()) {
    return fail(world, `Expected ${failure.toString()}, but last invokation was successful with result ${JSON.stringify(world.lastInvokation.value)}.`);
  }

  if (world.lastInvokation.error) {
    return fail(world, `Expected ${failure.toString()}, but last invokation threw error ${world.lastInvokation.error}.`);
  }

  if (world.lastInvokation.failures.length === 0) {
    throw new Error(`Invokation requires success, failure or error, got: ${world.lastInvokation.toString()}`);
  }

  if (world.lastInvokation.failures.find((f) => f.equals(failure)) === undefined) {
    return fail(world, `Expected ${failure.toString()}, but got ${world.lastInvokation.failures.toString()}.`);
  }

  return world;
}

async function assertRevertFailure(world: World, err: string, message: string): Promise<World> {
  if (!world.lastInvokation) {
    return fail(world, `Expected revert failure, but missing any invokations.`);
  }

  if (world.lastInvokation.success()) {
    return fail(world, `Expected revert failure, but last invokation was successful with result ${JSON.stringify(world.lastInvokation.value)}.`);
  }

  if (world.lastInvokation.failures.length > 0) {
    return fail(world, `Expected revert failure, but got ${world.lastInvokation.failures.toString()}.`);
  }

  if (!world.lastInvokation.error) {
    throw new Error(`Invokation requires success, failure or error, got: ${world.lastInvokation.toString()}`);
  }

  if (!(world.lastInvokation.error instanceof InvokationRevertFailure)) {
    throw new Error(`Invokation error mismatch, expected revert failure: "${err}, ${message}", got: "${world.lastInvokation.error.toString()}"`);
  }

  const expectedMessage = `Returned error: VM Exception while processing transaction: ${message}`;

  if (world.lastInvokation.error.error !== err || world.lastInvokation.error.errMessage !== expectedMessage) {
    throw new Error(`Invokation error mismatch, expected revert failure: err=${err}, message="${expectedMessage}", got: "${world.lastInvokation.error.toString()}"`);
  }

  return world;
}

async function assertError(world: World, message: string): Promise<World> {
  if (!world.lastInvokation) {
    return fail(world, `Expected revert, but missing any invokations.`);
  }

  if (world.lastInvokation.success()) {
    return fail(world, `Expected revert, but last invokation was successful with result ${JSON.stringify(world.lastInvokation.value)}.`);
  }

  if (world.lastInvokation.failures.length > 0) {
    return fail(world, `Expected revert, but got ${world.lastInvokation.failures.toString()}.`);
  }

  if (!world.lastInvokation.error) {
    throw new Error(`Invokation requires success, failure or error, got: ${world.lastInvokation.toString()}`);
  }

  if (!world.lastInvokation.error.message.startsWith(message)) {
    throw new Error(`Invokation error mismatch, expected: "${message}", got: "${world.lastInvokation.error.message}"`);
  }

  return world;
}

function buildRevertMessage(world: World, message: string): string {
  return `Returned error: VM Exception while processing transaction: ${message}`
}

async function assertRevert(world: World, message: string): Promise<World> {
  return await assertError(world, buildRevertMessage(world, message));
}

async function assertSuccess(world: World): Promise<World> {
  if (!world.lastInvokation || world.lastInvokation.success()) {
    return world;
  } else {
    return fail(world, `Expected success, but got ${world.lastInvokation.toString()}.`);
  }
}

async function assertReadError(world: World, event: Event, message: string, isRevert: boolean): Promise<World> {
  try {
    let value = await getCoreValue(world, event);

    throw new Error(`Expected read revert, instead got value \`${value}\``);
  } catch (err) {
    let expectedMessage;
    if (isRevert) {
      expectedMessage = buildRevertMessage(world, message);
    } else {
      expectedMessage = message;
    }

    world.assert.equal(expectedMessage, err.message, "expected read revert");
  }

  return world;
}

async function assertLog(world: World, event: string, keyValues: MapV): Promise<World> {
  if (!world.lastInvokation) {
    return fail(world, `Expected log message "${event}" from contract execution, but world missing any invokations.`);
  } else if (!world.lastInvokation.receipt) {
    return fail(world, `Expected log message "${event}" from contract execution, but world invokation transaction.`);
  } else {
    const log = world.lastInvokation.receipt.events[event];

    if (!log) {
      const events = Object.keys(world.lastInvokation.receipt.events).join(', ');

      fail(world, `Expected log with event \`${event}\`, found logs with events: [${events}]`);
    }

    Object.entries(keyValues.val).forEach(([key, value]) => {
      if (log.returnValues[key] === undefined) {
        fail(world, `Expected log to have param for \`${key}\``);
      } else {
        let logValue = new StringV(log.returnValues[key]);

        if (!value.compareTo(world, logValue)) {
          fail(world, `Expected log to have param \`${key}\` to match ${value.toString()}, but got ${logValue.toString()}`);
        }
      }
    });

    return world;
  }
}

export function assertionCommands() {
  return [
    new View<{given: NumberV, expected: NumberV, tolerance: NumberV}>(`
        #### Approx

        * "Approx given:<Value> expected:<Value> tolerance:<Value>" - Asserts that given approximately matches expected.
          * E.g. "Assert Approx (Exactly 0) Zero "
          * E.g. "Assert Approx (CToken cZRX TotalSupply) (Exactly 55) 1e-18"
          * E.g. "Assert Approx (CToken cZRX Comptroller) (Comptroller Address) 1"
      `,
      "Approx",
      [
        new Arg("given", getNumberV),
        new Arg("expected", getNumberV),
        new Arg("tolerance", getNumberV, {default: new NumberV(0.001)})
      ],
      (world, {given, expected, tolerance}) => assertApprox(world, given, expected, tolerance)
    ),

    new View<{given: Value, expected: Value}>(`
        #### Equal

        * "Equal given:<Value> expected:<Value>" - Asserts that given matches expected.
          * E.g. "Assert Equal (Exactly 0) Zero"
          * E.g. "Assert Equal (CToken cZRX TotalSupply) (Exactly 55)"
          * E.g. "Assert Equal (CToken cZRX Comptroller) (Comptroller Address)"
      `,
      "Equal",
      [
        new Arg("given", getCoreValue),
        new Arg("expected", getCoreValue)
      ],
      (world, {given, expected}) => assertEqual(world, given, expected)
    ),

    new View<{given: Value, expected: Value}>(`
        #### LessThan

        * "given:<Value> LessThan expected:<Value>" - Asserts that given matches expected.
          * E.g. "Assert (Exactly 0) LessThan (Exactly 1)"
      `,
      "LessThan",
      [
        new Arg("given", getCoreValue),
        new Arg("expected", getCoreValue)
      ],
      (world, {given, expected}) => assertLessThan(world, given, expected),
      {namePos: 1}
    ),

    new View<{given: Value}>(`
        #### True

        * "True given:<Value>" - Asserts that given is true.
          * E.g. "Assert True (Comptroller CheckMembership Geoff cETH)"
      `,
      "True",
      [
        new Arg("given", getCoreValue)
      ],
      (world, {given}) => assertEqual(world, given, new BoolV(true))
    ),

    new View<{given: Value}>(`
        #### False

        * "False given:<Value>" - Asserts that given is false.
          * E.g. "Assert False (Comptroller CheckMembership Geoff cETH)"
      `,
      "False",
      [
        new Arg("given", getCoreValue)
      ],
      (world, {given}) => assertEqual(world, given, new BoolV(false))
    ),
    new View<{event: EventV, message: StringV}>(`
        #### ReadRevert

        * "ReadRevert event:<Event> message:<String>" - Asserts that reading the given value reverts with given message.
          * E.g. "Assert ReadRevert (Comptroller CheckMembership Geoff cETH) \"revert\""
      `,
      "ReadRevert",
      [
        new Arg("event", getEventV),
        new Arg("message", getStringV)
      ],
      (world, {event, message}) => assertReadError(world, event.val, message.val, true)
    ),

    new View<{event: EventV, message: StringV}>(`
        #### ReadError

        * "ReadError event:<Event> message:<String>" - Asserts that reading the given value throws given error
          * E.g. "Assert ReadError (Comptroller Bad Address) \"cannot find comptroller\""
      `,
      "ReadError",
      [
        new Arg("event", getEventV),
        new Arg("message", getStringV)
      ],
      (world, {event, message}) => assertReadError(world, event.val, message.val, false)
    ),

    new View<{error: StringV, info: StringV, detail: StringV}>(`
        #### Failure

        * "Failure error:<String> info:<String> detail:<Number?>" - Asserts that last transaction had a graceful failure with given error, info and detail.
          * E.g. "Assert Failure UNAUTHORIZED SUPPORT_MARKET_OWNER_CHECK"
          * E.g. "Assert Failure MATH_ERROR MINT_CALCULATE_BALANCE 5"
      `,
      "Failure",
      [
        new Arg("error", getStringV),
        new Arg("info", getStringV),
        new Arg("detail", getStringV, {default: new StringV("0")}),
      ],
      (world, {error, info, detail}) => assertFailure(world, new Failure(error.val, info.val, detail.val))
    ),

    new View<{error: StringV, message: StringV}>(`
        #### RevertFailure

        * "RevertFailure error:<String> message:<String>" - Assert last transaction reverted with a message beginning with an error code
          * E.g. "Assert RevertFailure UNAUTHORIZED \"set reserves failed\""
      `,
      "RevertFailure",
      [
        new Arg("error", getStringV),
        new Arg("message", getStringV),
      ],
      (world, {error, message}) => assertRevertFailure(world, error.val, message.val)
    ),

    new View<{message: StringV}>(`
        #### Revert

        * "Revert message:<String>" - Asserts that the last transaction reverted.
      `,
      "Revert",
      [
        new Arg("message", getStringV, {default: new StringV("revert")}),
      ],
      (world, {message}) => assertRevert(world, message.val)
    ),

    new View<{message: StringV}>(`
        #### Error

        * "Error message:<String>" - Asserts that the last transaction had the given error.
      `,
      "Error",
      [
        new Arg("message", getStringV),
      ],
      (world, {message}) => assertError(world, message.val)
    ),

    new View<{given: Value}>(`
        #### Success

        * "Success" - Asserts that the last transaction completed successfully (that is, did not revert nor emit graceful failure).
      `,
      "Success",
      [],
      (world, {given}) => assertSuccess(world)
    ),

    new View<{name: StringV, params: MapV}>(`
        #### Log

        * "Log name:<String> (key:<String> value:<Value>) ..." - Asserts that last transaction emitted log with given name and key-value pairs.
          * E.g. "Assert Log Minted ("account" (User Geoff address)) ("amount" (Exactly 55))"
      `,
      "Log",
      [
        new Arg("name", getStringV),
        new Arg("params", getMapV, {variadic: true}),
      ],
      (world, {name, params}) => assertLog(world, name.val, params)
    )
  ];
}

export async function processAssertionEvent(world: World, event: Event, from: string | null): Promise<World> {
  return await processCommandEvent<any>("Assertion", assertionCommands(), world, event, from);
}
