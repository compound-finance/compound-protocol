import "@nomiclabs/hardhat-ethers";
import hre, { artifacts, ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { getDeployments } from "./utils/TestUtil";
import { formatAmount } from "./utils/TokenUtil";
import { CTOKENS, IERC20, CERC20 } from "./utils/constants";
import { deploy } from './deploy/cdelegators'
import { deployComptroller } from './deploy/comptroller'
import { expect } from "./utils/chai";
import BN = require("bn.js");

const network = hre.network
const provider = network.provider;
const cTokenGlpHolderAddress = '0xa50a90a7c3f8c83fa1e83ebced8b0e4dae581bcc';

describe("GLP", () => {
  const glpFixture = async () => {
    await deploy('arbitrum');
    await deployComptroller('hardhat');
    const cTokenGlpAddress = getDeployments('hardhat')['tfsGLP'];
    const cTokenGlpContract = await getCTokenGlpContract(cTokenGlpAddress);
    const cTokenGlpAdmin = await getCTokenGlpAdmin(cTokenGlpContract)
    const cTokenGlpHolder = await getCTokenGlpHolder();
    await fundWithEth(cTokenGlpHolder.address);
    await fundWithEth(cTokenGlpAdmin.address);

    const unitroller = await ethers.getContractAt('Comptroller', await cTokenGlpContract.comptroller())
    const unitrollerAdminAddress = await unitroller.admin();
    const unitrollerAdmin = await ethers.getImpersonatedSigner(unitrollerAdminAddress);
    // No longer private
    // await unitroller.connect(unitrollerAdmin).setWhitelistedUser(cTokenGlpHolder.address, true)
    // await unitroller.connect(unitrollerAdmin).setWhitelistedUser(cTokenGlpAdmin.address, true)

    const stakedGlpContract = await getStakedGlpContract(cTokenGlpContract);
    // 100 = 1% fee
    const glpContract = await getUnderlyingContract(cTokenGlpContract);
    const wEthContract = await getWEthContract(cTokenGlpContract);
    await cTokenGlpContract.connect(cTokenGlpAdmin)._setAutocompoundRewards(false);
    await cTokenGlpContract.connect(cTokenGlpAdmin)._setAutoCompoundBlockThreshold(1);
    await cTokenGlpContract.connect(cTokenGlpAdmin)._setVaultFees(formatAmount('3', 2), formatAmount('15', 2));
    await stakedGlpContract.connect(cTokenGlpHolder).approve(cTokenGlpContract.address, ethers.constants.MaxUint256);
    await stakedGlpContract.connect(cTokenGlpAdmin).approve(cTokenGlpContract.address, ethers.constants.MaxUint256);
    return {
      glpContract,
      stakedGlpContract,
      cTokenGlpContract,
      wEthContract,
      cTokenGlpAdmin,
      cTokenGlpHolder,
      unitroller,
      unitrollerAdmin
    };
  }
  describe("Set Vault Fees", () => {
    it("Should set performance and withdraw fees", async () => {
      const { glpContract, stakedGlpContract, cTokenGlpContract, wEthContract, cTokenGlpAdmin, cTokenGlpHolder, unitroller, unitrollerAdmin } = await loadFixture(glpFixture);
      await cTokenGlpContract.connect(cTokenGlpAdmin)._setVaultFees(formatAmount('2', 2), formatAmount('10', 2));
      const withdrawFee = await cTokenGlpContract.connect(cTokenGlpAdmin).withdrawFee()
      expect(formatAmount('2', 2).eq(withdrawFee)).true
      const performanceFee = await cTokenGlpContract.connect(cTokenGlpAdmin).performanceFee()
      expect(formatAmount('10', 2).eq(performanceFee)).true
    });
    it("Should respect maximum fees", async () => {
      const { glpContract, stakedGlpContract, cTokenGlpContract, wEthContract, cTokenGlpAdmin, cTokenGlpHolder, unitroller, unitrollerAdmin } = await loadFixture(glpFixture);
      await expect(
        cTokenGlpContract.connect(cTokenGlpAdmin)
        ._setVaultFees(
          formatAmount('3', 3),
          formatAmount('10', 3)
        )
      ).revertedWith('withdraw fee too high');
    });
  })
  describe("Performance Fee", () => {
    it("Should take Performace Fee out of compounded amount", async () => {
      const {
        glpContract,
        stakedGlpContract,
        cTokenGlpContract,
        wEthContract,
        cTokenGlpAdmin,
        cTokenGlpHolder,
        unitroller,
        unitrollerAdmin
      } = await loadFixture(glpFixture);
      await cTokenGlpContract.connect(cTokenGlpHolder).mint(formatAmount('1', 18));
      await cTokenGlpContract.connect(cTokenGlpAdmin).mint(formatAmount('1', 18));

      await logBalances(glpContract, cTokenGlpContract, wEthContract, 'before compound')
      const contractBalanceBefore = await glpContract.balanceOf(cTokenGlpContract.address);
      //
      await network.provider.send("hardhat_mine", ["0x4e8", "0x4c"]);
      await cTokenGlpContract.connect(cTokenGlpHolder).compound();
      await logBalances(glpContract, cTokenGlpContract, wEthContract, 'after compound')

      const contractBalanceAfter = await glpContract.balanceOf(cTokenGlpContract.address);
      console.log(contractBalanceAfter.sub(contractBalanceBefore))
    });
  });
  describe("Withdrawal Fee", () => {
    it("Should take Withdrawal Fee out of withdrawn amount", async () => {
      const {
        glpContract,
        stakedGlpContract,
        cTokenGlpContract,
        wEthContract,
        cTokenGlpAdmin,
        cTokenGlpHolder,
        unitroller,
        unitrollerAdmin
      } = await loadFixture(glpFixture);

      await cTokenGlpContract.connect(cTokenGlpHolder).mint(formatAmount('1', 18));
      await cTokenGlpContract.connect(cTokenGlpAdmin).mint(formatAmount('1', 18));
      await logBalances(glpContract, cTokenGlpContract, wEthContract, 'before redeem')
      // await cTokenGlpContract.connect(cTokenGlpHolder).redeem(formatAmount('1', 18));
      await cTokenGlpContract.connect(cTokenGlpHolder).redeemUnderlying(formatAmount('1', 18));
      await logBalances(glpContract, cTokenGlpContract, wEthContract, 'after redeem')
      await console.log(await cTokenGlpContract.balanceOf(cTokenGlpHolder.address))
    });
  });
  //check that errors when called from non admin
  describe("redeemUnderlyingForUser", () => {
    it("Should error when called by Non-Admin", async () => {
      console.log(getDeployments('arbitrum')['tfsGLP']);
      const {
        glpContract,
        stakedGlpContract,
        cTokenGlpContract,
        wEthContract,
        cTokenGlpAdmin,
        cTokenGlpHolder,
        unitroller,
        unitrollerAdmin
      } = await loadFixture(glpFixture);
      const cTokenGlpAddress = getDeployments('hardhat')['tfsGLP'];
      await stakedGlpContract.connect(cTokenGlpHolder).approve(cTokenGlpContract.address, ethers.constants.MaxUint256);
      await cTokenGlpContract.connect(cTokenGlpAdmin).mint(formatAmount('1', 18));
      await expect(
        cTokenGlpContract.connect(cTokenGlpHolder)
        .redeemUnderlyingForUser(
          formatAmount('1', 18),
          cTokenGlpAdmin.address
        )
      ).revertedWith('Only admin');
    });
    it("Admin should be able to redeem on user behalf", async () => {
      console.log(getDeployments('arbitrum')['tfsGLP']);
      const {
        glpContract,
        stakedGlpContract,
        cTokenGlpContract,
        wEthContract,
        cTokenGlpAdmin,
        cTokenGlpHolder,
        unitroller,
        unitrollerAdmin
      } = await loadFixture(glpFixture);
      const cTokenGlpAddress = getDeployments('hardhat')['tfsGLP'];
      console.log('cTokenGlpAddress', cTokenGlpAddress);
      await stakedGlpContract.connect(cTokenGlpHolder).approve(cTokenGlpContract.address, ethers.constants.MaxUint256);
      await cTokenGlpContract.connect(cTokenGlpHolder).mint(formatAmount('1', 18));
      const preRedeem = await cTokenGlpContract.balanceOf(cTokenGlpHolder.address);
      await cTokenGlpContract.connect(cTokenGlpAdmin).redeemUnderlyingForUser(formatAmount('1', 18), cTokenGlpHolder.address);
      const postRedeem = await cTokenGlpContract.balanceOf(cTokenGlpHolder.address);
      expect(postRedeem).bignumber.lt(preRedeem);
    })
  })
});

const logBalances = async (glpContract, cTokenGlpContract, wEthContract, time) => {
  console.log(`Glp Contract Underlying Balance ${time}`, await glpContract.balanceOf(cTokenGlpContract.address));
  console.log(`Glp Admin wEth ${time}`, await wEthContract.balanceOf(await cTokenGlpContract.admin()));
  console.log(`Glp Admin GLP ${time}`, await glpContract.balanceOf(await cTokenGlpContract.admin()));
}

const fundWithEth = async (receiver) => {
  const [ethWallet] = await ethers.getSigners();
  await ethWallet.sendTransaction({
    to: receiver,
    value: ethers.utils.parseEther("1.0"),
  });
};

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

