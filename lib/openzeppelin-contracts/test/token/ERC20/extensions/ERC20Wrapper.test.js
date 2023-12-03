const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ZERO_ADDRESS, MAX_UINT256 } = constants;

const { shouldBehaveLikeERC20 } = require('../ERC20.behavior');

const NotAnERC20 = artifacts.require('CallReceiverMock');
const ERC20Decimals = artifacts.require('$ERC20DecimalsMock');
const ERC20Wrapper = artifacts.require('$ERC20Wrapper');

contract('ERC20', function (accounts) {
  const [initialHolder, recipient, anotherAccount] = accounts;

  const name = 'My Token';
  const symbol = 'MTKN';

  const initialSupply = new BN(100);

  beforeEach(async function () {
    this.underlying = await ERC20Decimals.new(name, symbol, 9);
    await this.underlying.$_mint(initialHolder, initialSupply);

    this.token = await ERC20Wrapper.new(`Wrapped ${name}`, `W${symbol}`, this.underlying.address);
  });

  afterEach(async function () {
    expect(await this.underlying.balanceOf(this.token.address)).to.be.bignumber.equal(await this.token.totalSupply());
  });

  it('has a name', async function () {
    expect(await this.token.name()).to.equal(`Wrapped ${name}`);
  });

  it('has a symbol', async function () {
    expect(await this.token.symbol()).to.equal(`W${symbol}`);
  });

  it('has the same decimals as the underlying token', async function () {
    expect(await this.token.decimals()).to.be.bignumber.equal('9');
  });

  it('decimals default back to 18 if token has no metadata', async function () {
    const noDecimals = await NotAnERC20.new();
    const otherToken = await ERC20Wrapper.new(`Wrapped ${name}`, `W${symbol}`, noDecimals.address);
    expect(await otherToken.decimals()).to.be.bignumber.equal('18');
  });

  it('has underlying', async function () {
    expect(await this.token.underlying()).to.be.bignumber.equal(this.underlying.address);
  });

  describe('deposit', function () {
    it('valid', async function () {
      await this.underlying.approve(this.token.address, initialSupply, { from: initialHolder });
      const { tx } = await this.token.depositFor(initialHolder, initialSupply, { from: initialHolder });
      await expectEvent.inTransaction(tx, this.underlying, 'Transfer', {
        from: initialHolder,
        to: this.token.address,
        value: initialSupply,
      });
      await expectEvent.inTransaction(tx, this.token, 'Transfer', {
        from: ZERO_ADDRESS,
        to: initialHolder,
        value: initialSupply,
      });
    });

    it('missing approval', async function () {
      await expectRevert(
        this.token.depositFor(initialHolder, initialSupply, { from: initialHolder }),
        'ERC20: insufficient allowance',
      );
    });

    it('missing balance', async function () {
      await this.underlying.approve(this.token.address, MAX_UINT256, { from: initialHolder });
      await expectRevert(
        this.token.depositFor(initialHolder, MAX_UINT256, { from: initialHolder }),
        'ERC20: transfer amount exceeds balance',
      );
    });

    it('to other account', async function () {
      await this.underlying.approve(this.token.address, initialSupply, { from: initialHolder });
      const { tx } = await this.token.depositFor(anotherAccount, initialSupply, { from: initialHolder });
      await expectEvent.inTransaction(tx, this.underlying, 'Transfer', {
        from: initialHolder,
        to: this.token.address,
        value: initialSupply,
      });
      await expectEvent.inTransaction(tx, this.token, 'Transfer', {
        from: ZERO_ADDRESS,
        to: anotherAccount,
        value: initialSupply,
      });
    });
  });

  describe('withdraw', function () {
    beforeEach(async function () {
      await this.underlying.approve(this.token.address, initialSupply, { from: initialHolder });
      await this.token.depositFor(initialHolder, initialSupply, { from: initialHolder });
    });

    it('missing balance', async function () {
      await expectRevert(
        this.token.withdrawTo(initialHolder, MAX_UINT256, { from: initialHolder }),
        'ERC20: burn amount exceeds balance',
      );
    });

    it('valid', async function () {
      const value = new BN(42);

      const { tx } = await this.token.withdrawTo(initialHolder, value, { from: initialHolder });
      await expectEvent.inTransaction(tx, this.underlying, 'Transfer', {
        from: this.token.address,
        to: initialHolder,
        value: value,
      });
      await expectEvent.inTransaction(tx, this.token, 'Transfer', {
        from: initialHolder,
        to: ZERO_ADDRESS,
        value: value,
      });
    });

    it('entire balance', async function () {
      const { tx } = await this.token.withdrawTo(initialHolder, initialSupply, { from: initialHolder });
      await expectEvent.inTransaction(tx, this.underlying, 'Transfer', {
        from: this.token.address,
        to: initialHolder,
        value: initialSupply,
      });
      await expectEvent.inTransaction(tx, this.token, 'Transfer', {
        from: initialHolder,
        to: ZERO_ADDRESS,
        value: initialSupply,
      });
    });

    it('to other account', async function () {
      const { tx } = await this.token.withdrawTo(anotherAccount, initialSupply, { from: initialHolder });
      await expectEvent.inTransaction(tx, this.underlying, 'Transfer', {
        from: this.token.address,
        to: anotherAccount,
        value: initialSupply,
      });
      await expectEvent.inTransaction(tx, this.token, 'Transfer', {
        from: initialHolder,
        to: ZERO_ADDRESS,
        value: initialSupply,
      });
    });
  });

  describe('recover', function () {
    it('nothing to recover', async function () {
      await this.underlying.approve(this.token.address, initialSupply, { from: initialHolder });
      await this.token.depositFor(initialHolder, initialSupply, { from: initialHolder });

      const { tx } = await this.token.$_recover(anotherAccount);
      await expectEvent.inTransaction(tx, this.token, 'Transfer', {
        from: ZERO_ADDRESS,
        to: anotherAccount,
        value: '0',
      });
    });

    it('something to recover', async function () {
      await this.underlying.transfer(this.token.address, initialSupply, { from: initialHolder });

      const { tx } = await this.token.$_recover(anotherAccount);
      await expectEvent.inTransaction(tx, this.token, 'Transfer', {
        from: ZERO_ADDRESS,
        to: anotherAccount,
        value: initialSupply,
      });
    });
  });

  describe('erc20 behaviour', function () {
    beforeEach(async function () {
      await this.underlying.approve(this.token.address, initialSupply, { from: initialHolder });
      await this.token.depositFor(initialHolder, initialSupply, { from: initialHolder });
    });

    shouldBehaveLikeERC20('ERC20', initialSupply, initialHolder, recipient, anotherAccount);
  });
});
