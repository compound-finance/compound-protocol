import "@nomiclabs/hardhat-ethers";
import hre, { artifacts, ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { getDeployments } from "./utils/TestUtil";
import { formatAmount } from "./utils/TokenUtil";
import { CTOKENS, IERC20, CERC20 } from "./utils/constants";
import { deploy } from './deploy/cdelegators'
import { expect } from "./utils/chai";

const network = hre.network
const provider = network.provider;
const cTokenGlpHolderAddress = '0xa50a90a7c3f8c83fa1e83ebced8b0e4dae581bcc';

const getCTokenGlpContract = async (cTokenGlpDelegatorAddress) => {
  return await ethers.getContractAt(CERC20, cTokenGlpDelegatorAddress);
}
const getCTokenGlpHolder = async () => {
  return await ethers.getImpersonatedSigner(cTokenGlpHolderAddress);
}
const getCTokenGlpAdmin = async (glpContract) => {
  return await ethers.getImpersonatedSigner(await glpContract.admin());
}
const getUnderlyingContract = async (glpContract) => {
  return await ethers.getContractAt(IERC20, await glpContract.underlying());
}
const getStakedGlpContract = async (glpContract) => {
  return await ethers.getContractAt(IERC20, await glpContract.stakedGLP());
}
const getWEthContract = async (glpContract) => {
  return await ethers.getContractAt(IERC20, await glpContract.WETH());
}

describe("GLP", () => {
  const glpFixture = async () => {
  }
  describe("Performance Fee", () => {
    it("Should take Performace Fee out of compounded amount", async () => {
      // await loadFixture(glpFixture);
      await deploy('arbitrum');
      const cTokenGlpAddress = getDeployments('hardhat')['tfsGLP'];
      // console.log('cTokenGlpAddress', cTokenGlpAddress);
      // const cTokenGlpAddress = '0xa79f8cE76fb7cD466Cfe13316cC146a328Eb0A55'
      const cTokenGlpContract = await getCTokenGlpContract(cTokenGlpAddress);
      const cTokenGlpAdmin = await getCTokenGlpAdmin(cTokenGlpContract)
      const cTokenGlpHolder = await getCTokenGlpHolder();
      await fundWithEth(cTokenGlpHolder.address);
      await fundWithEth(cTokenGlpAdmin.address);

      const unitroller = await ethers.getContractAt('Comptroller', await cTokenGlpContract.comptroller())
      console.log(unitroller.address)
      const unitrollerAdminAddress = await unitroller.admin();
      const unitrollerAdmin = await ethers.getImpersonatedSigner(unitrollerAdminAddress);

      await unitroller.connect(unitrollerAdmin).setWhitelistedUser(cTokenGlpHolder.address, true)
      await unitroller.connect(unitrollerAdmin).setWhitelistedUser(cTokenGlpAdmin.address, true)

      const glpContract = await getUnderlyingContract(cTokenGlpContract);
      const wEthContract = await getWEthContract(cTokenGlpContract);
      const stakedGlpContract = await getStakedGlpContract(cTokenGlpContract);

      // 100 = 1% fee
      await cTokenGlpContract.connect(cTokenGlpAdmin)._setAutocompoundRewards(true);
      await cTokenGlpContract.connect(cTokenGlpAdmin)._setAutoCompoundBlockThreshold(1);
      await cTokenGlpContract.connect(cTokenGlpAdmin)._setVaultFees(10, 100*15);
      await stakedGlpContract.connect(cTokenGlpHolder).approve(cTokenGlpContract.address, ethers.constants.MaxUint256);
      await stakedGlpContract.connect(cTokenGlpAdmin).approve(cTokenGlpContract.address, ethers.constants.MaxUint256);
      await cTokenGlpContract.connect(cTokenGlpHolder).mint(formatAmount('30', 8));
      await cTokenGlpContract.connect(cTokenGlpAdmin).mint(formatAmount('30', 8));

      await logBalances(glpContract, cTokenGlpContract, wEthContract, 'before compound')
      // await cTokenGlpContract.connect(cTokenGlpHolder).compoundGlp();
      // await logBalances(glpContract, cTokenGlpContract, wEthContract, 'after compound')
      //
      const contractBalanceBefore = await glpContract.balanceOf(cTokenGlpContract.address);
      //
      await network.provider.send("hardhat_mine", ["0x4e8", "0x4c"]);
      await cTokenGlpContract.connect(cTokenGlpHolder).compoundGlp();
      await logBalances(glpContract, cTokenGlpContract, wEthContract, 'after compound')

      const contractBalanceAfter = await glpContract.balanceOf(cTokenGlpContract.address);
      console.log(contractBalanceAfter.sub(contractBalanceBefore))
    });
  });
});

const logBalances = async (glpContract, cTokenGlpContract, wEthContract, time) => {
  console.log(`Glp Contract Underlying Balance ${time}`, await glpContract.balanceOf(cTokenGlpContract.address));
  console.log(`Glp Admin wEth ${time}`, await wEthContract.balanceOf(await cTokenGlpContract.admin()));
}

const fundWithEth = async (receiver) => {
  const [ethWallet] = await ethers.getSigners();
  await ethWallet.sendTransaction({
    to: receiver,
    value: ethers.utils.parseEther("1.0"),
  });
};
