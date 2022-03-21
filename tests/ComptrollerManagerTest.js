const {
  makeComptroller,
} = require('./Utils/Compound');
const {
  etherExp,
  etherUnsigned,
} = require('./Utils/Ethereum');

async function compAccrued(comptroller, user) {
  return etherUnsigned(await call(comptroller, 'compAccrued', [user]));
}

async function compBalance(comp, user) {
  return etherUnsigned(await call(comp, 'balanceOf', [user]));
}

describe('ComptrollerManager', () => {
  let root, holder;
  let comptrollerManager, comp, comptroller1, comptroller2;
  beforeEach(async () => {
    [root, holder] = saddle.accounts;
    comptrollerManager = await deploy('ComptrollerManager');
    comp = await deploy('Comp', [root, 'COMP', 'Compound']);
    comptroller1 = await makeComptroller({comp});
    comptroller2 = await makeComptroller({comp});
  });

  describe('claimComp', () => {
    it('should claim from multiple Comptroller', async () => {
      const compRemaining = etherExp(1), accruedAmt = etherUnsigned(0.0009e18);
      await send(comptroller1.comp, 'transfer', [comptroller1._address, compRemaining], {from: root});
      await send(comptroller1, 'setCompAccrued', [holder, accruedAmt]);
      await send(comptroller2.comp, 'transfer', [comptroller2._address, compRemaining], {from: root});
      await send(comptroller2, 'setCompAccrued', [holder, accruedAmt]);
      await send(comptrollerManager, 'claimComp', [holder, [comptroller1._address, comptroller2._address]]);
      expect(await compAccrued(comptroller1, holder)).toEqualNumber(0);
      expect(await compAccrued(comptroller2, holder)).toEqualNumber(0);
      expect(await compBalance(comp, holder)).toEqualNumber(accruedAmt.times(2));
    });
  });
});
