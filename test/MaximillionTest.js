const {
  etherBalance,
  etherGasCost,
  getContract,
  call,
  send
} = require('./Utils/MochaTruffle');

const {
  makeComptroller,
  makeCToken,
  makePriceOracle,
  pretendBorrow,
  borrowSnapshot
} = require('./Utils/Compound');

const Maximillion = getContract('Maximillion');

contract('Maximillion', function([root, borrower]) {
  let maximillion, cEther;
  before(async () =>{
    cEther = await makeCToken({kind: "cether", supportMarket: true});
    maximillion = await Maximillion.deploy({arguments: [cEther._address]}).send({from: root});
  });

  describe("constructor", async () => {
    it("sets address of cEther", async () => {
      assert.equal(await call(maximillion, "cEther"), cEther._address);
    });
  });

  describe("repayBehalf", async () => {
    it("refunds the entire amount with no borrows", async () => {
      const beforeBalance = await etherBalance(root);
      const result = await send(maximillion, "repayBehalf", [borrower], {value: 100});
      const gasCost = await etherGasCost(result);
      const afterBalance = await etherBalance(root);
      assert.success(result);
      assert.numEqual(afterBalance, beforeBalance.sub(gasCost));
    });

    it("repays part of a borrow", async () => {
      await pretendBorrow(cEther, borrower, 1, 1, 150);
      const beforeBalance = await etherBalance(root);
      const result = await send(maximillion, "repayBehalf", [borrower], {value: 100});
      const gasCost = await etherGasCost(result);
      const afterBalance = await etherBalance(root);
      const afterBorrowSnap = await borrowSnapshot(cEther, borrower);
      assert.success(result);
      assert.numEqual(afterBalance, beforeBalance.sub(gasCost).sub(100));
      assert.numEqual(afterBorrowSnap.principal, 50);
    });

    it("repays a full borrow and refunds the rest", async () => {
      await pretendBorrow(cEther, borrower, 1, 1, 90);
      const beforeBalance = await etherBalance(root);
      const result = await send(maximillion, "repayBehalf", [borrower], {value: 100});
      const gasCost = await etherGasCost(result);
      const afterBalance = await etherBalance(root);
      const afterBorrowSnap = await borrowSnapshot(cEther, borrower);
      assert.success(result);
      assert.numEqual(afterBalance, beforeBalance.sub(gasCost).sub(90));
      assert.numEqual(afterBorrowSnap.principal, 0);
    });
  });
});
