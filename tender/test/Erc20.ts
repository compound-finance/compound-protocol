import { JsonRpcSigner, JsonRpcProvider, ExternalProvider } from '@ethersproject/providers';
import { CTokenContract } from './Token'
import { getWallet, getAbiFromArbiscan, resetNetwork } from './TestUtil'
import * as hre from 'hardhat';
import * as ethers from 'ethers'
import { BigNumber, Contract } from 'ethers';
import { expect } from 'chai';
import { formatAmount, getUnderlyingBalance } from './TokenUtil';
const hreProvider = hre.network.provider;

const provider = new ethers.providers.Web3Provider(hreProvider as any);


const tests = [
  {
    symbol: 'tUSDC',
    contractName: 'CErc20',
    mintAmount: '4',
    borrowAmount: '1',
    redeemAmount: '1',
    redeemUnderlyingAmount: '1',
  },
  {
    symbol: 'tEth',
    contractName: 'CEther',
    walletAddress: '0x52134afB1A391fcEEE6682E51aedbCD47dC55336',
    mintAmount: '0.001',
    redeemAmount: 'all',
    borrowAmount: '0.0005',
  },
]

let erc20Contract: CTokenContract;
let uContractAddress: string;
let uContract: Contract;
let wallet: JsonRpcSigner;

let tDecimals: number;
let uDecimals: number;

let uBalanceProvider: Contract | JsonRpcProvider;

const walletAddress = '0x52134afB1A391fcEEE6682E51aedbCD47dC55336';

describe('Erc20', () => {
  before(async () => {
    resetNetwork();
    wallet = await getWallet(walletAddress, provider)
  })

  for(let test of tests) {
    describe(test.symbol, () => {
      before(async () => {
        erc20Contract = new CTokenContract(test.symbol, test.contractName, wallet);
        tDecimals = await erc20Contract.decimals();

        if (erc20Contract['underlying']) {
          // tEth has no underlying method
          uContractAddress = await erc20Contract.underlying();
          uContract = new Contract(uContractAddress, erc20Contract.abi, wallet);
          uBalanceProvider = uContract;
          uDecimals = await uContract.decimals();
        } else {
          uContract = null;
          uDecimals = 18; // Ether decimals
          uBalanceProvider = provider;
        }
      })
      if(test['mintAmount']) {
        describe('Mint', () => {
          it('Should have more tTokens and fewer uTokens', async () => {
            const tBalance = await erc20Contract.balanceOf(wallet._address);
            const uBalance = await getUnderlyingBalance(uBalanceProvider, wallet._address);

            if (uContract) {
              await uContract.approve(erc20Contract.address, formatAmount(test.mintAmount, uDecimals));
            }

            await erc20Contract.mint(formatAmount(test['mintAmount'], uDecimals));

            const tBalanceTest = (await erc20Contract.balanceOf(wallet._address)).sub(tBalance).gt(0);
            const uBalanceTest = (await getUnderlyingBalance(uBalanceProvider, wallet._address)).sub(uBalance).lt(0);

            expect(tBalanceTest).to.be.true;
            expect(uBalanceTest).to.be.true;
          });
        });
      }
      if(test['redeemAmount']) {
        describe('redeem', () => {
          it('Should have less tTokens and more uTokens', async () => {
            let redeemAmount;

            const tBalance = await erc20Contract.balanceOf(wallet._address);
            const uBalance = await getUnderlyingBalance(uBalanceProvider, wallet._address);

            if (test['redeemAmount'] == 'all') {
              redeemAmount = tBalance;
            } else {
              redeemAmount = formatAmount(test['redeemAmount'], await erc20Contract.decimals());
            }

            await erc20Contract.approve(wallet._address, redeemAmount);
            await erc20Contract.redeem(redeemAmount);

            const tBalanceTest = (await erc20Contract.balanceOf(wallet._address)).sub(tBalance).lt(0);
            const uBalanceTest = (await getUnderlyingBalance(uBalanceProvider, wallet._address)).sub(uBalance).gt(0);

            expect(tBalanceTest).to.be.true;
            expect(uBalanceTest).to.be.true;
          });
        })
      }
      if(test['redeemUnderlyingAmount']) {
        describe('redeemUnderlying', () => {
          it('Should have less tTokens and more uTokens', async () => {
            const tBalance = await erc20Contract.balanceOf(wallet._address);
            const uBalance = await getUnderlyingBalance(uBalanceProvider, wallet._address);

            const redeemUnderlyingAmount = formatAmount(test['redeemUnderlyingAmount'], uDecimals);

            await erc20Contract.approve(wallet._address, redeemUnderlyingAmount);
            await erc20Contract.redeem(redeemUnderlyingAmount);

            const tBalanceTest = (await erc20Contract.balanceOf(wallet._address)).sub(tBalance).lt(0);
            const uBalanceTest = (await getUnderlyingBalance(uBalanceProvider, wallet._address)).sub(uBalance).gt(0);

            expect(tBalanceTest).to.be.true;
            expect(uBalanceTest).to.be.true;
          });
        })
      }
      if(test['borrowAmount']) {
        describe('Borrow', () => {
            // it('Should have more tTokens and fewer uTokens', async () => {
            //   let borrowBalance = await erc20Contract.borrowBalanceStored()
            //   console.log(borrowBalance.toString())
            //   await erc20Contract.borrow(formatAmount(.0005));
            //   borrowBalance = await erc20Contract.borrowBalanceStored()
            //   console.log(borrowBalance.toString())
            // });
        })
      }
    })
  }
})

