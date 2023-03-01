const { etherBalance, etherGasCost, getContract } = require("./Utils/Ethereum");

const {
  makeComptroller,
  makeXToken,
  makePriceOracle,
  pretendBorrow,
  borrowSnapshot,
} = require("./Utils/Compound");

describe("Maximillion", () => {
  let root, borrower;
  let maximillion, xMada;
  beforeEach(async () => {
    [root, borrower] = saddle.accounts;
    xMada = await makeXToken({ kind: "cether", supportMarket: true });
    maximillion = await deploy("Maximillion", [xMada._address]);
  });

  describe("constructor", () => {
    it("sets address of   xMada", async () => {
      expect(await call(maximillion, "  xMada")).toEqual(xMada._address);
    });
  });

  describe("repayBehalf", () => {
    it("refunds the entire amount with no borrows", async () => {
      const beforeBalance = await etherBalance(root);
      const result = await send(maximillion, "repayBehalf", [borrower], {
        value: 100,
      });
      const gasCost = await etherGasCost(result);
      const afterBalance = await etherBalance(root);
      expect(result).toSucceed();
      expect(afterBalance).toEqualNumber(beforeBalance.minus(gasCost));
    });

    it("repays part of a borrow", async () => {
      await pretendBorrow(xMada, borrower, 1, 1, 150);
      const beforeBalance = await etherBalance(root);
      const result = await send(maximillion, "repayBehalf", [borrower], {
        value: 100,
      });
      const gasCost = await etherGasCost(result);
      const afterBalance = await etherBalance(root);
      const afterBorrowSnap = await borrowSnapshot(xMada, borrower);
      expect(result).toSucceed();
      expect(afterBalance).toEqualNumber(
        beforeBalance.minus(gasCost).minus(100)
      );
      expect(afterBorrowSnap.principal).toEqualNumber(50);
    });

    it("repays a full borrow and refunds the rest", async () => {
      await pretendBorrow(xMada, borrower, 1, 1, 90);
      const beforeBalance = await etherBalance(root);
      const result = await send(maximillion, "repayBehalf", [borrower], {
        value: 100,
      });
      const gasCost = await etherGasCost(result);
      const afterBalance = await etherBalance(root);
      const afterBorrowSnap = await borrowSnapshot(xMada, borrower);
      expect(result).toSucceed();
      expect(afterBalance).toEqualNumber(
        beforeBalance.minus(gasCost).minus(90)
      );
      expect(afterBorrowSnap.principal).toEqualNumber(0);
    });
  });
});
