import { parseAbiFromJson, getDeployments } from "../utils/TestUtil";
import {
  JsonRpcSigner,
  JsonRpcProvider,
  ExternalProvider,
} from "@ethersproject/providers";
import { resolve } from "path";
import { Wallet, Contract, BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export class OracleContract {
  public contract: Contract;
  public address: string;

  constructor(oracleName: string, signer: JsonRpcSigner | SignerWithAddress) {
    const oracleAbiPath = resolve(
      __dirname,
      `../../../artifacts/contracts/${oracleName}.sol/${oracleName}.json`
    );

    this.address = getDeployments().MockPriceOracle;

    this.contract = new Contract(
      this.address,
      parseAbiFromJson(oracleAbiPath),
      signer
    );
  }

  call = async (method: string, ...args: any[]) => {
    try {
      return await this.contract[method](...args);
    } catch (e) {
      throw e;
    }
  };

  mockUpdatePrice = async (ctokenAddress: string, price: BigNumber) => {
    return await this.call("mockUpdatePrice", ctokenAddress, price);
  };

  getUnderlyingPrice = async (ctokenAddress: string) => {
    return await this.call("getUnderlyingPrice", ctokenAddress);
  };
}
