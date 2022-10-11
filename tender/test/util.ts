import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import { Wallet } from 'ethers';
import { readFileSync } from 'fs';
import axios, { AxiosResponse } from 'axios';
import { join } from 'path';
import * as hre from 'hardhat';
import * as fs from 'fs'
import * as dotenv from 'dotenv';
dotenv.config();
import * as ethers from 'ethers'

export type BaseToken<Token> = {
  [Property in keyof Token as Exclude<Property, "underlying">]: Token[Property];
};

export type Token = {
  implementation: string,
  address: string,
  underlying: Token | BaseToken<Token>,
}

export type TokenInfo = {
  [index: string]: Token
}

const arbiscanKey = process.env.ARBISCAN_KEY;
const arbiscanUrl = 'https://api.arbiscan.io/api?module=contract&action=getabi&apikey=' + arbiscanKey + '&address=';

export const parseAbiFromJson = (fpath: string) => {
  try {
    const file = fs.readFileSync(fpath, "utf8")
    const json = JSON.parse(file)
    const abi = json.abi
    return abi
  } catch (e) {
    console.log(`e`, e)
  }
}

export const impersonateAccount = async (address: string, provider: JsonRpcProvider) => {
  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [ address ]
  });
  return await provider.getSigner(address);
}

const tokenInfoMap: TokenInfo = {
  tusdc: {
    address: '0x0BdF3cb0D390ce8d8ccb6839b1CfE2953983b5f1',
    implementation: '0x8765B2266ebCd935c8c781d93F2e3BFA0da34c6e',
    underlying: {
      address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
      implementation: '0x1eFB3f88Bc88f03FD1804A5C53b7141bbEf5dED8'
    },
  }
}

export const getTokenInfo = (tokenName: string) => {
  return tokenInfoMap[tokenName];
}
