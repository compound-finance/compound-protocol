const {
  address,
  etherMantissa,
  encodeParameters,
  mineBlock,
  unlockedAccount,
  mergeInterface
} = require('../../Utils/Ethereum');
const EIP712 = require('../../Utils/EIP712');
const BigNumber = require('bignumber.js');
const chalk = require('chalk');

async function enfranchise(comp, actor, amount) {
  await send(comp, 'transfer', [actor, etherMantissa(amount)]);
  await send(comp, 'delegate', [actor], { from: actor });
}

describe("governorAlpha#castVote/2", () => {
  let comp, gov, root, a1, accounts, govDelegate, govAlpha;
  let targets, values, signatures, callDatas, proposalId;

  beforeAll(async () => {
    [root, a1, ...accounts] = saddle.accounts;
    comp = await deploy('Comp', [root]);
    govDelegate = await deploy('GovernorBravoDelegate');
    gov = await deploy('GovernorBravoDelegator', [address(0), comp._address, root, govDelegate._address, 17280, 1]);
    govAlpha = await deploy('GovernorAlpha', [address(0), comp._address, root]);
    mergeInterface(gov,govDelegate);

    // targets = [a1];
    // values = ["0"];
    // signatures = ["getBalanceOf(address)"];
    // callDatas = [encodeParameters(['address'], [a1])];
    // // await send(gov, '_become', [govAlpha._address]);
    // mergeInterface(gov,govDelegate);
    // await send(comp, 'delegate', [root]);
    // await send(gov, 'propose', [targets,values,signatures,callDatas,"do nothing"]);
    // proposalId = await call(gov, 'latestProposalIds', [root]);
    // console.log('here');
    // console.log(proposalId);
  });

  describe("We must revert if:", () => {
    it("There does not exist a proposal with matching proposal id where the current block number is between the proposal's start block (exclusive) and end block (inclusive)", async () => {
      await expect(
        call(gov, 'castVote', [proposalId, 4, ""])
      ).rejects.toRevert("revert GovernorAlpha::_castVote: voting is closed");
    });
  });
});