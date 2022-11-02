import { Wallet, Contract, BigNumber } from "ethers";
import { formatAmount } from "../utils/TokenUtil";
import * as ethers from "ethers";
import {
  JsonRpcSigner,
  JsonRpcProvider,
  ExternalProvider,
} from "@ethersproject/providers";
import { resolve } from "path";
import { parseAbiFromJson, getDeployments } from "../utils/TestUtil";
import axios from "axios";

// do not allow numbers since they cause issues

export class CTokenContract {
  public abi: string;
  public signer: JsonRpcSigner;
  public symbol: string;
  public address: string;
  public contract: Contract;
  public hasUnderlying: bool;
  public uContract: any;
  public uDecimals: bigNumber;

  private contractName: string;

  constructor(
    symbol: string,
    contractName: string,
    signer: JsonRpcSigner,
    deploymentFilePath?: string
  ) {
    const address = getDeployments(deploymentFilePath)[symbol];
    const abiPath = resolve(
      __dirname,
      `../../../artifacts/contracts/${contractName}.sol/${contractName}.json`
    );
    this.abi = parseAbiFromJson(abiPath);
    this.symbol = symbol;
    this.contractName = contractName;
    this.signer = signer;
    this.address = address;
    if (this.abi) {
      this.contract = new Contract(this.address, this.abi, this.signer);
    }

    if (this.contract["underlying"]) {
      this.hasUnderlying = true;
    } else {
      this.hasUnderlying = false;
    }
  }

  call = async (method: string, ...args: any[]) => {
    try {
      return await this.contract[method](...args);
    } catch (e) {
      throw e;
    }
  };

  createContractInstance = () => {
    return new Contract(this.address, this.abi, this.signer);
  };

  createUnderlyingContractInstance = async () => {
    if (this.hasUnderlying) {
      this.uContract = new Contract(
        await this.underlying(),
        this.abi,
        this.signer
      );
      this.uDecimals = await this.uContract.decimals();
    } else {
      this.uContract = null;
      this.uDecimals = 18;
    }
    return this.uContract;
  };

  supply = async (amount: string) => {
    if (this.uContract === undefined) {
      await this.createUnderlyingContractInstance();
    }
    if (this.contract["underlying"]) {
      await this.uContract.approve(
        this.address,
        formatAmount(amount, this.uDecimals)
      );
    }
    await this.mint(formatAmount(amount, this.uDecimals));
  };

  getUnderlyingBalance = async (address: string) => {
    if (this.uContract === undefined) {
      await this.createUnderlyingContractInstance();
    }
    if (this.hasUnderlying) {
      return await this.uContract.balanceOf(address);
    } else {
      return await this.signer.provider.getBalance(address);
    }
  };

  liquidateBorrow = async (
    borrower: string,
    cTokenCollateral: string,
    amount: BigNumber
  ) => {
    if (this.contractName == "CEther") {
      return await this.call("liquidateBorrow", borrower, cTokenCollateral, {
        value: amount,
      });
    } else if (this.contractName == "CErc20") {
      return await this.call(
        "liquidateBorrow",
        borrower,
        amount,
        cTokenCollateral
      );
    }
  };

  borrow = async (amount: BigNumber) => {
    return await this.call("borrow", amount);
  };

  balanceOf = async (address?: string) => {
    address = address ? address : this.signer._address;
    return this.call("balanceOf", address);
  };

  mint = async (amount: BigNumber) => {
    if (this.symbol == "tEth") {
      return await this.call("mint", { value: amount });
    }
    return await this.call("mint", amount);
  };

  approve = async (spender: string, amount: BigNumber) => {
    return await this.call("approve", spender, amount);
  };

  comptroller = async () => {
    return await this.call("comptroller");
  };

  redeem = async (amount: BigNumber) => {
    return await this.call("redeem", amount);
  };

  redeemUnderlying = async (amount: BigNumber) => {
    return await this.call("redeemUnderlying", amount);
  };

  borrow = async (amount: BigNumber) => {
    return await this.call("borrow", amount);
  };

  borrowBalanceStored = async (accountAddress?: string) => {
    accountAddress = accountAddress ? accountAddress : this.signer._address;
    return await this.call("borrowBalanceStored", accountAddress);
  };

  exchangeRateStored = async () => {
    return await this.call("exchangeRateStored");
  };

  decimals = async () => {
    return await this.call("decimals");
  };

  underlying = async () => {
    return await this.call("underlying");
  };

  async getAssetPriceUsd() {
    if (this.symbol === "ETH") {
      let res = await axios.get(
        "https://api.coinbase.com/v2/prices/ETH-USD/sell"
      );
      return parseFloat(res.data.data.amount);
    }
    if (!this.decimals) {
      this.decimals = await this.call("decimals");
    }
    let answer: BigNumber = await this.call("getUnderlyingPrice", this.address);
    // based on calculation from compound subgraph
  }
}

export class GmxTokenContract extends CTokenContract {
  constructor(
    symbol: string,
    contractName: string,
    signer: JsonRpcSigner,
    deploymentFilePath?: string
  ) {
    super(symbol, contractName, signer, deploymentFilePath);
  }
}
