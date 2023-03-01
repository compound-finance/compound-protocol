const { task } = require("hardhat/config");
const { saveContractAddress, toBN } = require("../utils");
const conf = require("../../../conf.json");

task("deploy-xerc20-delegator")
  .addParam("interestRateModel", "The interest rate model address")
  .addParam("token", "token symbol")
  .addParam("implementation", "The implementation address")
  .addParam("comptroller", "The comptroller address")
  .setAction(async (taskArgs, { ethers }) => {
    const contractName = "XErc20Delegator";
    const [deployer] = await ethers.getSigners();

    console.log(
      `Deploying ${contractName} contract with the account:`,
      deployer.address
    );

    const constructorArguements = conf[contractName][taskArgs.token];
    const underlying = constructorArguements["underlying"];

    const initialExchangeRateMantissa = toBN(
      constructorArguements["initialExchangeRateMantissa"]
    );

    const name = constructorArguements["name"];
    const symbol = constructorArguements["symbol"];
    const decimals = constructorArguements["decimals"];

    const admin = constructorArguements["admin"];
    const becomeImplementationData =
      constructorArguements["becomeImplementationData"];

    const XErc20Delegator = await hre.ethers.getContractFactory(contractName);
    const xerc20Delegator = await XErc20Delegator.deploy(
      underlying,
      taskArgs.comptroller,
      taskArgs.interestRateModel,
      initialExchangeRateMantissa,
      name,
      symbol,
      decimals,
      admin,
      taskArgs.implementation,
      becomeImplementationData
    );

    await xerc20Delegator.deployed();

    saveContractAddress(
      network.config.chainId,
      `${contractName}_${taskArgs.token}`,
      xerc20Delegator.address
    );

    console.log(
      `${contractName} deployed to address:`,
      xerc20Delegator.address
    );

    return xerc20Delegator;
  });
