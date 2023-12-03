const { expectRevert, BN } = require('@openzeppelin/test-helpers');

const { expect } = require('chai');

const { getChainId } = require('../../helpers/chainid');
const { clockFromReceipt } = require('../../helpers/time');

const { shouldBehaveLikeVotes } = require('./Votes.behavior');

const MODES = {
  blocknumber: artifacts.require('$VotesMock'),
  timestamp: artifacts.require('$VotesTimestampMock'),
};

contract('Votes', function (accounts) {
  const [account1, account2, account3] = accounts;

  for (const [mode, artifact] of Object.entries(MODES)) {
    describe(`vote with ${mode}`, function () {
      beforeEach(async function () {
        this.name = 'My Vote';
        this.votes = await artifact.new(this.name, '1');
      });

      it('starts with zero votes', async function () {
        expect(await this.votes.getTotalSupply()).to.be.bignumber.equal('0');
      });

      describe('performs voting operations', function () {
        beforeEach(async function () {
          this.tx1 = await this.votes.$_mint(account1, 1);
          this.tx2 = await this.votes.$_mint(account2, 1);
          this.tx3 = await this.votes.$_mint(account3, 1);
          this.tx1.timepoint = await clockFromReceipt[mode](this.tx1.receipt);
          this.tx2.timepoint = await clockFromReceipt[mode](this.tx2.receipt);
          this.tx3.timepoint = await clockFromReceipt[mode](this.tx3.receipt);
        });

        it('reverts if block number >= current block', async function () {
          await expectRevert(this.votes.getPastTotalSupply(this.tx3.timepoint + 1), 'Votes: future lookup');
        });

        it('delegates', async function () {
          await this.votes.delegate(account3, account2);

          expect(await this.votes.delegates(account3)).to.be.equal(account2);
        });

        it('returns total amount of votes', async function () {
          expect(await this.votes.getTotalSupply()).to.be.bignumber.equal('3');
        });
      });

      describe('performs voting workflow', function () {
        beforeEach(async function () {
          this.chainId = await getChainId();
          this.account1 = account1;
          this.account2 = account2;
          this.account1Delegatee = account2;
          this.NFT0 = new BN('10000000000000000000000000');
          this.NFT1 = new BN('10');
          this.NFT2 = new BN('20');
          this.NFT3 = new BN('30');
        });

        // includes EIP6372 behavior check
        shouldBehaveLikeVotes(mode);
      });
    });
  }
});
