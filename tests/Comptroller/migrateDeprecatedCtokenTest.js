const {etherMantissa} = require('../Utils/Ethereum');

const {
  makeComptroller,
  makeCToken,
  enterMarkets
} = require('../Utils/Compound');

describe('seizeWbtcTest', () => {
  let root, customer, accounts;
  let comptroller;
  let allTokens, OMG, ZRX, BAT, REP, DAI, SKT, WBTC, WBTC2;

  let user, amount, balance

  beforeEach(async () => {
    [root, customer, ...accounts] = saddle.accounts;
    comptroller = await makeComptroller({maxAssets: 10});
    allTokens = [OMG, ZRX, BAT, REP, DAI, SKT, WBTC] = await Promise.all(
      ['OMG', 'ZRX', 'BAT', 'REP', 'DAI', 'sketch', 'WBTC']
        .map(async (name) => makeCToken({comptroller, name, symbol: name, supportMarket: name != 'sketch', underlyingPrice: 0.5}))
    );

    const wbtcUnderlying = WBTC.underlying._address;
    from = user = accounts[0], balance = 1e7, amount = 1e6;
    await enterMarkets([WBTC], from);
    await send(WBTC.underlying, 'harnessSetBalance', [from, balance], {from});
    await send(WBTC.underlying, 'approve', [WBTC._address, balance], {from});
    await send(WBTC, 'mint', [amount], {from});
  
    // generate cWBTC2 with the same underlying as WBTC
    WBTC2 = await makeCToken({comptroller, name: "cWBTC2", symbol: "WBTC", supportMarket: true, underlyingPrice: 0.5, underlying: {_address: wbtcUnderlying}});

    // deprecate WBTC
    expect(await send(comptroller, '_setCollateralFactor', [WBTC._address, 0])).toSucceed();
    expect(await send(comptroller, '_setBorrowPaused', [WBTC._address, true])).toSucceed();
    expect(await send(WBTC, '_setReserveFactor', [etherMantissa(1)])).toSucceed();    
  });

  it('verify deployment', async () => {
    const wbtcUnderlying = await call(WBTC,"underlying",[]);
    const wbtc2Underlying = await call(WBTC2,"underlying",[]);        
    expect(wbtcUnderlying).toEqual(wbtc2Underlying);
    expect(await call(WBTC, "balanceOf", [user])).toEqual(amount.toString());
    expect(await call(WBTC2, "balanceOf", [user])).toEqual("0");    
  });
  
  it('seize', async () => {
    await send(comptroller, "migrateDeprecatedCToken", [user, WBTC._address, WBTC2._address]);
    expect(await call(WBTC, "balanceOf", [user])).toEqual("0");    
    expect(await call(WBTC2, "balanceOf", [user])).toEqual((amount * (1 - 0.028)).toString());
  });  
});
