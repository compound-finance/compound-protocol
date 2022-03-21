const rand = x => new bn(Math.floor(Math.random() * x));
const range = count => [...Array(count).keys()];

const bn = require('bignumber.js');
bn.config({ ROUNDING_MODE: bn.ROUND_HALF_DOWN });

const RUN_COUNT = 20;
const NUM_EVENTS = 50;
const PRECISION_DECIMALS = 15;

class AssertionError extends Error {
  constructor(assertion, reason, event, index) {
    const message = `Assertion Error: ${reason} when processing ${JSON.stringify(
      event
    )} at pos ${index}`;

    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

expect.extend({
  toFuzzPass(assertion, expected, actual, reason, state, events) {
    const eventStr = events
      .filter(({ failed }) => !failed)
      .map(event => `${JSON.stringify(event)},`)
      .join('\n');

    return {
      pass: !!assertion(expected, actual),
      message: () => `
        Expected: ${JSON.stringify(expected)},
        Actual: ${JSON.stringify(actual)},
        Reason: ${reason}
        State: \n${JSON.stringify(state, null, '\t')}
        Events:\n${eventStr}
      `
    };
  }
});

describe.skip('CompWheelFuzzTest', () => {
  // This whole test is fake, but we're testing to see if our equations match reality.

  // First, we're going to build a simple simulator of the Compound protocol

  const randAccount = globals => {
    return globals.accounts[rand(globals.accounts.length)];
  };

  const get = src => {
    return src || new bn(0);
  };

  const isPositive = (src) => {
    // eslint-disable-next-line no-undef
    assert(bn.isBigNumber(src), "isPositive got wrong type: expected bigNumber");
    return src.decimalPlaces(PRECISION_DECIMALS).isGreaterThan(0);
  };

  const almostEqual = (expected, actual) => {
    return expected.decimalPlaces(PRECISION_DECIMALS).eq(actual.decimalPlaces(PRECISION_DECIMALS));
  };

  const deepCopy = src => {
    return Object.entries(src).reduce((acc, [key, val]) => {
      if (bn.isBigNumber(val)) {
        return {
          ...acc,
          [key]: new bn(val)
        };
      } else {
        return {
          ...acc,
          [key]: deepCopy(val)
        };
      }
    }, {});
  };

  const initialState = globals => {
    return {
      // ctoken
      accrualBlockNumber: globals.blockNumber,
      borrowIndex: new bn(1),
      totalCash: new bn(0),
      totalSupply: new bn(0),
      totalBorrows: new bn(0),
      totalReserves: new bn(0),
      reserveFactor: new bn(0.05),

      balances: {},
      borrowBalances: {},
      borrowIndexSnapshots: {},

      // flywheel & comptroller
      compSupplySpeed: new bn(1),
      compSupplyIndex: new bn(1),
      compSupplyIndexSnapshots: {},
      compSupplyIndexUpdatedBlock: globals.blockNumber,

      compBorrowSpeed: new bn(1),
      compBorrowIndex: new bn(1),
      compBorrowIndexSnapshots: {},
      compBorrowIndexUpdatedBlock: globals.blockNumber,

      compAccruedWithCrank: {}, // naive method, accruing all accounts every block
      compAccruedWithIndex: {}, // with indices

      activeBorrowBlocks: new bn(0), // # blocks with an active borrow, for which we expect to see comp distributed. just for fuzz testing.
      activeSupplyBlocks: new bn(0)
    };
  };

  const getExchangeRate = ({
    totalCash,
    totalSupply,
    totalBorrows,
    totalReserves
  }) => {
    if (isPositive(totalSupply)) {
      return totalCash
        .plus(totalBorrows)
        .minus(totalReserves)
        .div(totalSupply);
    } else {
      return new bn(1);
    }
  };

  const getBorrowRate = (cash, borrows, reserves) => {
    const denom = cash.plus(borrows).minus(reserves);
    if (denom.isZero()) {
      return new bn(0);
    } else if (denom.lt(0)) {
      throw new Error(
        `Borrow Rate failure cash:${cash} borrows:${borrows} reserves:${reserves}`
      );
    } else {
      const util = borrows.div(denom);
      return util.times(0.001);
    }
  };

  // only used after events are run to test invariants
  const trueUpComp = (globals, state) => {
    state = accrueInterest(globals, state);

    state = Object.keys(state.compSupplyIndexSnapshots).reduce(
      (acc, account) => supplierFlywheelByIndex(globals, state, account),
      state
    );

    state = Object.keys(state.compBorrowIndexSnapshots).reduce(
      (acc, account) => borrowerFlywheelByIndex(globals, state, account),
      state
    );

    return state;
  };

  // manual flywheel loops through every account and updates comp accrued mapping
  // cranked within accrue interest (borrowBalance not updated, totalBorrows should be)
  const flywheelByCrank = (
    state,
    deltaBlocks,
  ) => {
    const {
      balances,
      compBorrowSpeed,
      compSupplySpeed,
      totalSupply,
      totalBorrows,
      compAccruedWithCrank,
      borrowBalances
    } = state;

    // suppliers
    for (const [account, balance] of Object.entries(balances)) {
      if (isPositive(totalSupply)) {
        compAccruedWithCrank[account] = get(
          state.compAccruedWithCrank[account]
        ).plus(
          deltaBlocks
            .times(compSupplySpeed)
            .times(balance)
            .div(totalSupply)
        );
      }
    }

    // borrowers
    for (const [account] of Object.entries(borrowBalances)) {
      if (isPositive(totalBorrows)) {
        const truedUpBorrowBalance = getAccruedBorrowBalance(state, account);

        compAccruedWithCrank[account] = get(
          state.compAccruedWithCrank[account]
        ).plus(
          deltaBlocks
            .times(compBorrowSpeed)
            .times(truedUpBorrowBalance)
            .div(totalBorrows)
        );
      }
    }

    return {
      ...state,
      compAccruedWithCrank: compAccruedWithCrank,
    };
  };

  // real deal comp index flywheel™️
  const borrowerFlywheelByIndex = (globals, state, account) => {
    let {compBorrowIndex} = state;
    const {
      compBorrowSpeed,
      compBorrowIndexSnapshots,
      compAccruedWithIndex,
      totalBorrows,
      borrowBalances,
      compBorrowIndexUpdatedBlock,
      borrowIndex,
    } = state;

    const deltaBlocks = globals.blockNumber.minus(compBorrowIndexUpdatedBlock);
    if (isPositive(totalBorrows)) {
      const scaledTotalBorrows = totalBorrows.div(borrowIndex);
      compBorrowIndex = compBorrowIndex.plus(
        compBorrowSpeed.times(deltaBlocks).div(scaledTotalBorrows)
      );
    }

    const indexSnapshot = compBorrowIndexSnapshots[account];

    if (
      indexSnapshot !== undefined &&
      compBorrowIndex.isGreaterThan(indexSnapshot) &&
      borrowBalances[account] !== undefined
    ) {
      // to simulate borrowBalanceStored
      const borrowBalanceNew = borrowBalances[account]
        .times(borrowIndex)
        .div(state.borrowIndexSnapshots[account]);
      compAccruedWithIndex[account] = get(compAccruedWithIndex[account]).plus(
        borrowBalanceNew
          .div(borrowIndex)
          .times(compBorrowIndex.minus(indexSnapshot))
      );
    }

    return {
      ...state,
      compBorrowIndexUpdatedBlock: globals.blockNumber,
      compBorrowIndex: compBorrowIndex,
      compBorrowIndexSnapshots: {
        ...state.compBorrowIndexSnapshots,
        [account]: compBorrowIndex
      }
    };
  };

  // real deal comp index flywheel™️
  const supplierFlywheelByIndex = (globals, state, account) => {
    let {compSupplyIndex} = state;
    const {
      balances,
      compSupplySpeed,
      compSupplyIndexSnapshots,
      compAccruedWithIndex,
      totalSupply,
      compSupplyIndexUpdatedBlock
    } = state;

    const deltaBlocks = globals.blockNumber.minus(compSupplyIndexUpdatedBlock);

    if (isPositive(totalSupply)) {
      compSupplyIndex = compSupplyIndex.plus(
        compSupplySpeed.times(deltaBlocks).div(totalSupply)
      );
    }

    const indexSnapshot = compSupplyIndexSnapshots[account];
    if (indexSnapshot !== undefined) {
      // if had prev snapshot,  accrue some comp
      compAccruedWithIndex[account] = get(compAccruedWithIndex[account]).plus(
        balances[account].times(compSupplyIndex.minus(indexSnapshot))
      );
    }

    return {
      ...state,
      compSupplyIndexUpdatedBlock: globals.blockNumber,
      compSupplyIndex: compSupplyIndex,
      compSupplyIndexSnapshots: {
        ...state.compSupplyIndexSnapshots,
        [account]: compSupplyIndex
      },
      compAccruedWithIndex: compAccruedWithIndex
    };
  };

  const accrueActiveBlocks = (state, deltaBlocks) => {
    let {
      activeBorrowBlocks,
      activeSupplyBlocks
    } = state;
    const {
      totalBorrows,
      totalSupply
    } = state;
    
    if (isPositive(totalSupply)) {
      activeSupplyBlocks = activeSupplyBlocks.plus(deltaBlocks);
    }

    if (isPositive(totalBorrows)) {
      activeBorrowBlocks = activeBorrowBlocks.plus(deltaBlocks);
    }

    return {
      ...state,
      activeSupplyBlocks: activeSupplyBlocks,
      activeBorrowBlocks: activeBorrowBlocks
    };
  };

  const getAccruedBorrowBalance = (state, account) => {
    const prevBorrowBalance = state.borrowBalances[account];
    const checkpointBorrowIndex = state.borrowIndexSnapshots[account];
    if (
      prevBorrowBalance !== undefined &&
      checkpointBorrowIndex !== undefined
    ) {
      return prevBorrowBalance
        .times(state.borrowIndex)
        .div(checkpointBorrowIndex);
    } else {
      return new bn(0);
    }
  };

  const accrueInterest = (globals, state) => {
    const {
      totalCash,
      totalBorrows,
      totalReserves,
      accrualBlockNumber,
      borrowIndex,
      reserveFactor
    } = state;

    const deltaBlocks = globals.blockNumber.minus(accrualBlockNumber);
    state = accrueActiveBlocks(state, deltaBlocks);

    const borrowRate = getBorrowRate(totalCash, totalBorrows, totalReserves);
    const simpleInterestFactor = deltaBlocks.times(borrowRate);
    const borrowIndexNew = borrowIndex.times(simpleInterestFactor.plus(1));
    const interestAccumulated = totalBorrows.times(simpleInterestFactor);
    const totalBorrowsNew = totalBorrows.plus(interestAccumulated);
    const totalReservesNew = totalReserves
      .plus(interestAccumulated)
      .times(reserveFactor);

    state = flywheelByCrank(
      state,
      deltaBlocks,
      borrowIndexNew,
      state.borrowIndex
    );

    return {
      ...state,
      accrualBlockNumber: globals.blockNumber,
      borrowIndex: borrowIndexNew,
      totalBorrows: totalBorrowsNew,
      totalReserves: totalReservesNew
    };
  };

  const mine = {
    action: 'mine',
    rate: 10,
    run: (globals, state) => {
      return state;
    },
    gen: () => {
      return {
        mine: rand(100).plus(1)
      };
    }
  };

  const gift = {
    action: 'gift',
    rate: 3,
    run: (globals, state, { amount }) => {
      amount = new bn(amount);
      return {
        ...state,
        totalCash: state.totalCash.plus(amount)
      };
    },
    gen: () => {
      return {
        amount: rand(1000)
      };
    }
  };

  /* eslint-disable */

  const test = {
    action: 'test',
    run: (globals, state, { amount }, { assert }) => {
      console.log(state);
      return state;
    }
  };

  /* eslint-enable */

  const borrow = {
    action: 'borrow',
    rate: 10,
    run: (globals, state, { account, amount }, { assert }) => {
      amount = new bn(amount);
      state = accrueInterest(globals, state);
      state = borrowerFlywheelByIndex(globals, state, account);

      const newTotalCash = state.totalCash.minus(amount);
      assert(
        isPositive(newTotalCash.plus(state.totalReserves)),
        'Attempted to borrow more than total cash'
      );

      const newBorrowBalance = getAccruedBorrowBalance(state, account).plus(
        amount
      );
      assert(
        get(state.balances[account])
          .times(getExchangeRate(state))
          .isGreaterThan(newBorrowBalance),
        'Borrower undercollateralized'
      );

      return {
        ...state,
        totalBorrows: state.totalBorrows.plus(amount),
        totalCash: newTotalCash,
        borrowBalances: {
          ...state.borrowBalances,
          [account]: newBorrowBalance
        },
        borrowIndexSnapshots: {
          ...state.borrowIndexSnapshots,
          [account]: state.borrowIndex
        }
      };
    },
    gen: globals => {
      return {
        account: randAccount(globals),
        amount: rand(1000)
      };
    }
  };

  const repayBorrow = {
    action: 'repayBorrow',
    rate: 10,
    run: (globals, state, { account, amount }, { assert }) => {
      amount = new bn(amount);
      state = accrueInterest(globals, state);
      state = borrowerFlywheelByIndex(globals, state, account);

      const accruedBorrowBalance = getAccruedBorrowBalance(state, account);
      assert(isPositive(accruedBorrowBalance), 'No active borrow');

      if (amount.isGreaterThan(accruedBorrowBalance)) {
        // repay full borrow
        delete state.borrowIndexSnapshots[account];
        delete state.borrowBalances[account];
        state.totalBorrows = state.totalBorrows.minus(accruedBorrowBalance);
      } else {
        state.borrowIndexSnapshots[account] = state.borrowIndex;
        state.borrowBalances[account] = accruedBorrowBalance.minus(amount);
        state.totalBorrows = state.totalBorrows.minus(amount);
      }

      return {
        ...state,
        totalCash: state.totalCash.plus(bn.min(amount, accruedBorrowBalance))
      };
    },
    gen: globals => {
      return {
        account: randAccount(globals),
        amount: rand(1000)
      };
    }
  };

  const mint = {
    action: 'mint',
    rate: 10,
    run: (globals, state, { account, amount }) => {
      amount = new bn(amount);
      state = accrueInterest(globals, state);
      state = supplierFlywheelByIndex(globals, state, account);

      const balance = get(state.balances[account]);
      const exchangeRate = getExchangeRate(state);
      const tokens = amount.div(exchangeRate);
      return {
        ...state,
        totalCash: state.totalCash.plus(amount), // ignores transfer fees
        totalSupply: state.totalSupply.plus(tokens),
        balances: {
          ...state.balances,
          [account]: balance.plus(tokens)
        }
      };
    },
    gen: globals => {
      return {
        account: randAccount(globals),
        amount: rand(1000)
      };
    }
  };

  const redeem = {
    action: 'redeem',
    rate: 10,
    run: (globals, state, { account, tokens }, { assert }) => {
      tokens = new bn(tokens);
      state = accrueInterest(globals, state);
      state = supplierFlywheelByIndex(globals, state, account);

      const balance = get(state.balances[account]);
      assert(balance.isGreaterThan(tokens), 'Redeem fails for insufficient balance');
      const exchangeRate = getExchangeRate(state);
      const amount = tokens.times(exchangeRate);

      return {
        ...state,
        totalCash: state.totalCash.minus(amount), // ignores transfer fees
        totalSupply: state.totalSupply.minus(tokens),
        balances: {
          ...state.balances,
          [account]: balance.minus(tokens)
        }
      };
    },
    gen: globals => {
      return {
        account: randAccount(globals),
        tokens: rand(1000)
      };
    }
  };

  const actors = {
    mine,
    mint,
    redeem,
    gift,
    borrow,
    repayBorrow
    // test
  };

  const generateGlobals = () => {
    return {
      blockNumber: new bn(1000),
      accounts: ['Adam Savage', 'Ben Solo', 'Jeffrey Lebowski']
    };
  };

  // assert amount distributed by the crank is expected, that it equals # blocks with a supply * comp speed
  const crankCorrectnessInvariant = (globals, state, events, invariantFn) => {
    const expected = state.activeSupplyBlocks
      .times(state.compSupplySpeed)
      .plus(state.activeBorrowBlocks.times(state.compBorrowSpeed));

    const actual = Object.values(state.compAccruedWithCrank).reduce(
      (acc, val) => acc.plus(val),
      new bn(0)
    );
    invariantFn(
      almostEqual,
      expected,
      actual,
      `crank method distributed comp inaccurately`
    );
  };

  // assert comp distributed by index is the same as amount distributed by crank
  const indexCorrectnessInvariant = (globals, state, events, invariantFn) => {
    const expected = state.compAccruedWithCrank;
    const actual = state.compAccruedWithIndex;
    invariantFn(
      (expected, actual) => {
        return Object.keys(expected).reduce((succeeded, account) => {
          return (
            almostEqual(get(expected[account]), get(actual[account])) &&
            succeeded
          );
        }, true);
      },
      expected,
      actual,
      `crank method does not match index method`
    );
  };

  const testInvariants = (globals, state, events, invariantFn) => {
    crankCorrectnessInvariant(globals, state, events, invariantFn);
    indexCorrectnessInvariant(globals, state, events, invariantFn);
  };

  const randActor = () => {
    // TODO: Handle weighting actors
    const actorKeys = Object.keys(actors);
    const actorsLen = actorKeys.length;
    return actors[actorKeys[rand(actorsLen)]];
  };

  const executeAction = (globals, state, event, i) => {
    const prevState = deepCopy(state);
    const assert = (assertion, reason) => {
      if (!assertion) {
        throw new AssertionError(assertion, reason, event, i);
      }
    };

    try {
      return actors[event.action].run(globals, state, event, { assert });
    } catch (e) {
      if (e instanceof AssertionError) {
        // TODO: ignore e!
        console.debug(`assertion failed: ${e.toString()}`);
        event.failed = true;
        return prevState;
      } else {
        throw e;
      }
    } finally {
      if (event.mine) {
        globals.blockNumber = globals.blockNumber.plus(event.mine);
      }
    }
  };

  const runEvents = (globals, initState, events) => {
    const state = events.reduce(executeAction.bind(null, globals), initState);
    return trueUpComp(globals, state);
  };

  const generateEvent = globals => {
    const actor = randActor();

    return {
      ...actor.gen(globals),
      action: actor.action
    };
  };

  const generateEvents = (globals, count) => {
    return range(count).map(() => {
      return generateEvent(globals);
    });
  };

  function go(invariantFn) {
    const globals = generateGlobals();
    const initState = initialState(globals);
    const events = generateEvents(globals, NUM_EVENTS);
    const state = runEvents(globals, initState, events);

    const invariantFnBound = (assertion, expected, actual, reason) => {
      invariantFn(assertion, expected, actual, reason, state, events);
    };

    testInvariants(globals, state, events, invariantFnBound);
  }

  range(RUN_COUNT).forEach(count => {
    it(`runs: ${count}`, () => {
      const invariant = (assertion, expected, actual, reason, state, events) => {
        expect(assertion).toFuzzPass(expected, actual, reason, state, events);
      };

      go(invariant);
    });
  });
});
