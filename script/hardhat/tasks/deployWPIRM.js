const { task } = require("hardhat/config");
const { saveContractAddress, toBN } = require("../utils");
const config = require("../../../conf.json");

const contractName = "WhitePaperInterestRateModel";

// WPIRM: WhitePaperInterestRateModel
task("deploy-wpirm")
  .addParam("token", "token symbol")
  .setAction(async (taskArgs, { ethers }) => {
    const constructorArguements = config[contractName][taskArgs.token];
    let baseRatePerYear = constructorArguements["baseRatePerYear"];

    baseRatePerYear = toBN((Number(baseRatePerYear) / 100).toString());

    let multiplierPerYear = constructorArguements["multiplierPerYear"];
    multiplierPerYear = toBN((Number(multiplierPerYear) / 100).toString());

    const [deployer] = await ethers.getSigners();

    console.log(`Active network: ${network.name}, ${network.config.chainId}`);
    console.log(
      `Deploying ${contractName} contract with the account:`,
      deployer.address
    );
    const WhitePaperInterestRateModel = await hre.ethers.getContractFactory(
      "WhitePaperInterestRateModel"
    );
    const whitePaperInterestRateModel = await WhitePaperInterestRateModel.deploy(
      baseRatePerYear,
      multiplierPerYear
    );

    await whitePaperInterestRateModel.deployed();

    saveContractAddress(
      network.config.chainId,
      contractName,
      whitePaperInterestRateModel.address
    );

    console.log(
      `${contractName} deployed to address:`,
      whitePaperInterestRateModel.address
    );

    return whitePaperInterestRateModel.address;
  });
