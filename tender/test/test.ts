import * as hre from 'hardhat';
import * as ethers from 'ethers';
import * as path from 'path';

import { JsonRpcSigner, JsonRpcProvider, ExternalProvider } from '@ethersproject/providers';
import { Contract } from 'ethers';
import {
  parseAbiFromJson,
  getTokenInfo,
  impersonateAccount,
} from './util';
import { expect } from 'chai';

const hreProvider = hre.network.provider;
// eslint disable-next-line
const provider = new ethers.providers.Web3Provider(hreProvider as any);

const walletAddress = '0x52134afB1A391fcEEE6682E51aedbCD47dC55336';

const erc20ContractInstance = (tokenAddress: string, signer: JsonRpcSigner) => {
  const erc20AbiPath = path.resolve(
    __dirname,
    '../../artifacts/contracts/CErc20Delegate.sol/CErc20Delegate.json'
  )
  const abi = parseAbiFromJson(erc20AbiPath);
  return new ethers.Contract(tokenAddress, abi, signer);
}

const getErc20Balance = async (tokenContract: Contract, wallet: JsonRpcSigner) => {
  return Number(await tokenContract.balanceOf(wallet._address))
}

describe('tUSDC', () => {
  const tTokenName = 'tusdc'
  const tTokenInfo = getTokenInfo(tTokenName);
  const uTokenInfo = tTokenInfo.underlying;

  describe('Mint', () => {
    it('Should have more tTokens and fewer uTokens', async () => {
      const wallet = await impersonateAccount(walletAddress, provider);

      const tTokenContract = erc20ContractInstance(tTokenInfo.address, wallet);
      const uTokenContract = erc20ContractInstance(uTokenInfo.address, wallet);

      let tBalance: number = await getErc20Balance(tTokenContract, wallet);
      let uBalance: number = await getErc20Balance(uTokenContract, wallet);

      await uTokenContract.approve(tTokenContract.address, 10);
      await tTokenContract.mint(10);

      tBalance = await getErc20Balance(tTokenContract, wallet) - tBalance;
      uBalance = await getErc20Balance(uTokenContract, wallet) - uBalance;

      expect(tBalance).greaterThan(0);
      expect(uBalance).equals(-10);
    })
  })
  describe('RedeemUnderlying', () => {
    it('Should have more uTokens and fewer tTokens', async () => {
      const wallet = await impersonateAccount(walletAddress, provider);

      const tTokenContract = erc20ContractInstance(tTokenInfo.address, wallet);
      const uTokenContract = erc20ContractInstance(uTokenInfo.address, wallet);

      let tBalance: number = await getErc20Balance(tTokenContract, wallet);
      let uBalance: number = await getErc20Balance(uTokenContract, wallet);

      await tTokenContract.approve(uTokenContract.address, 3);
      await tTokenContract.redeemUnderlying(3);
      // clarify parameter, doesn't seem to redeem right amount acc. to docs

      tBalance = await getErc20Balance(tTokenContract, wallet) - tBalance;
      uBalance = await getErc20Balance(uTokenContract, wallet) - uBalance;


      expect(tBalance).lessThan(0);
      expect(uBalance).greaterThan(0);
    })
  });
  describe('Redeem', () => {
    it('Should have more uTokens and fewer tTokens', async () => {
      const wallet = await impersonateAccount(walletAddress, provider);

      const tTokenContract = erc20ContractInstance(tTokenInfo.address, wallet);
      const uTokenContract = erc20ContractInstance(uTokenInfo.address, wallet);

      let tBalance: number = await getErc20Balance(tTokenContract, wallet);
      let uBalance: number = await getErc20Balance(uTokenContract, wallet);

      await tTokenContract.approve(uTokenContract.address, 300000);
      await tTokenContract.redeem(300000);
      // clarify parameter, doesn't seem to redeem right amount acc. to docs

      tBalance = await getErc20Balance(tTokenContract, wallet) - tBalance;
      uBalance = await getErc20Balance(uTokenContract, wallet) - uBalance;


      expect(tBalance).lessThan(0);
      expect(uBalance).greaterThan(0);
    })
  });
})
