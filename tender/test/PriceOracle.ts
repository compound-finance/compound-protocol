import { parseAbiFromJson, getDeployments } from "./TestUtil";
import {
  JsonRpcSigner,
  JsonRpcProvider,
  ExternalProvider,
} from "@ethersproject/providers";
import { resolve } from "path";
import { Wallet, Contract, BigNumber } from "ethers";

export class OracleContract {
  public contract: Contract;

  constructor(oracleName: string, signer: JsonRpcSigner) {
    const oracleAbiPath = resolve(
      __dirname,
      `../../artifacts/contracts/${oracleName}.sol/${oracleName}.json`
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

  mockUpdatePrice = async (ctokenAddress: string, price: bigNumber) => {
    return await this.call("mockUpdatePrice", ctokenAddress, price);
  };

  getUnderlyingPrice = async (ctokenAddress: string) => {
    return await this.call("getUnderlyingPrice", ctokenAddress);
  };
}
