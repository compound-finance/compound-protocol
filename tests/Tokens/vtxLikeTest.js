const {
  makeVToken,
} = require('../Utils/Vortex');


describe('VVtxLikeDelegate', function () {
  describe("_delegateVtxLikeTo", () => {
    it("does not delegate if not the admin", async () => {
      const [root, a1] = saddle.accounts;
      const vToken = await makeVToken({kind: 'vvtx'});
      await expect(send(vToken, '_delegateVtxLikeTo', [a1], {from: a1})).rejects.toRevert('revert only the admin may set the vtx-like delegate');
    });

    it("delegates successfully if the admin", async () => {
      const [root, a1] = saddle.accounts, amount = 1;
      const vVTX = await makeVToken({kind: 'vvtx'}), VTX = vVTX.underlying;
      const tx1 = await send(vVTX, '_delegateVtxLikeTo', [a1]);
      const tx2 = await send(VTX, 'transfer', [vVTX._address, amount]);
      await expect(await call(VTX, 'getCurrentVotes', [a1])).toEqualNumber(amount);
    });
  });
});