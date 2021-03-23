const {
  etherBalance,
  etherGasCost,
  getContract
} = require('./Utils/Ethereum');

const {
  makeController,
  makeVToken,
  makePriceOracle,
  pretendBorrow,
  borrowSnapshot
} = require('./Utils/Vortex');

describe('Maximillion', () => {
  let root, borrower;
  let maximillion, vEther;
  beforeEach(async () => {
    [root, borrower] = saddle.accounts;
    vEther = await makeVToken({kind: "vether", supportMarket: true});
    maximillion = await deploy('Maximillion', [vEther._address]);
  });

  describe("constructor", () => {
    it("sets address of vEther", async () => {
      expect(await call(maximillion, "vEther")).toEqual(vEther._address);
    });
  });

  describe("repayBehalf", () => {
    it("refunds the entire amount with no borrows", async () => {
      const beforeBalance = await etherBalance(root);
      const result = await send(maximillion, "repayBehalf", [borrower], {value: 100});
      const gasCost = await etherGasCost(result);
      const afterBalance = await etherBalance(root);
      expect(result).toSucceed();
      expect(afterBalance).toEqualNumber(beforeBalance.minus(gasCost));
    });

    it("repays part of a borrow", async () => {
      await pretendBorrow(vEther, borrower, 1, 1, 150);
      const beforeBalance = await etherBalance(root);
      const result = await send(maximillion, "repayBehalf", [borrower], {value: 100});
      const gasCost = await etherGasCost(result);
      const afterBalance = await etherBalance(root);
      const afterBorrowSnap = await borrowSnapshot(vEther, borrower);
      expect(result).toSucceed();
      expect(afterBalance).toEqualNumber(beforeBalance.minus(gasCost).minus(100));
      expect(afterBorrowSnap.principal).toEqualNumber(50);
    });

    it("repays a full borrow and refunds the rest", async () => {
      await pretendBorrow(vEther, borrower, 1, 1, 90);
      const beforeBalance = await etherBalance(root);
      const result = await send(maximillion, "repayBehalf", [borrower], {value: 100});
      const gasCost = await etherGasCost(result);
      const afterBalance = await etherBalance(root);
      const afterBorrowSnap = await borrowSnapshot(vEther, borrower);
      expect(result).toSucceed();
      expect(afterBalance).toEqualNumber(beforeBalance.minus(gasCost).minus(90));
      expect(afterBorrowSnap.principal).toEqualNumber(0);
    });
  });
});
