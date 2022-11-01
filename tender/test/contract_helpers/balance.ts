import {
  JsonRpcSigner,
  JsonRpcProvider,
  ExternalProvider,
} from "@ethersproject/providers";
import { getWallet, getAbiFromArbiscan, resetNetwork } from "../utils/TestUtil";
import { Wallet, Contract, BigNumber } from "ethers";
import { resolve } from "path";
import { parseAbiFromJson, getDeployments } from "../utils/TestUtil";
import axios from "axios";
import { formatAmount, getUnderlyingBalance } from "../utils/TokenUtil";
import * as hre from "hardhat";
import * as ethers from "ethers";
import { GmxTokenContract, CTokenContract } from "../utils/Token";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";

const hreProvider = hre.network.provider;

const provider = new ethers.providers.Web3Provider(hreProvider as any);

const uDecimals = 6;

const main = async () => {
  resetNetwork();
  const wallet = await getWallet(
    "0x5B33EC561Cb20EaF7d5b41A9B68A690E2EBBc893",
    provider
  );
  const abi = await getAbiFromArbiscan(
    "0x668791FBBD01C77cF71d437D3eDe173AF78F4E2C"
  );

  const cTokenContract = new ethers.Contract(
    "0x668791FBBD01C77cF71d437D3eDe173AF78F4E2C",
    abi,
    wallet
  );

  const uContractAddress = await cTokenContract.underlying();
  //console.log("uContractAddress", uContractAddress);
  const uAbi = await getAbiFromArbiscan(
    "0x1efb3f88bc88f03fd1804a5c53b7141bbef5ded8"
  );
  const uContract = new Contract(uContractAddress, uAbi, wallet);
  const uBalanceProvider = uContract;
  await uContract.approve(cTokenContract.address, ethers.constants.MaxUint256);
  //console.log(await cTokenContract.balanceOfUnderlying(wallet._address));
};

main();
