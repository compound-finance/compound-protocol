const { task } = require("hardhat/config");
const { saveContractAddress, toBN } = require("../utils");
const conf = require("../../../conf.json");

task("deploy-mada")
  .addParam("interestRateModel", "The interest rate model address")
  .addParam("comptroller", "The comptroller address")
  .setAction(async (taskArgs, { ethers }) => {
    const contractName = "XMada";
    const [deployer] = await ethers.getSigners();

    console.log(
      `Deploying ${contractName} contract with the account:`,
      deployer.address
    );

    const constructorArguements = conf["MADA"];
    const initialExchangeRateMantissa = toBN(
      constructorArguements["initialExchangeRateMantissa"]
    );

    const name = constructorArguements["name"];
    const symbol = constructorArguements["symbol"];
    const decimals = constructorArguements["decimals"];
    const admin = constructorArguements["admin"];

    const CEther = await hre.ethers.getContractFactory(contractName);

    const xMada = await CEther.deploy(
      taskArgs.comptroller,
      taskArgs.interestRateModel,
      initialExchangeRateMantissa,
      name,
      symbol,
      decimals,
      admin
    );

    await xMada.deployed();

    saveContractAddress(network.config.chainId, contractName, xMada.address);

    console.log(`${contractName} deployed to address:`, xMada.address);

    return xMada;
  });
