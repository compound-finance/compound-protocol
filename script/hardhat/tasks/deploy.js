require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });

const { task } = require("hardhat/config");
const { toBN } = require("../utils");
const conf = require("../../../conf.json");
const OracleABI = require("../../../artifacts/contracts/SimplePriceOracle.sol/SimplePriceOracle.json");

task("deploy-all").setAction(async (taskArgs, { run, ethers }) => {
  const [deployer] = await ethers.getSigners();

  // Deploy Contracts
  const usdcInterestRateModel = await run("deploy-wpirm", {
    token: "USDC",
  });

  const mADAInterestRateModel = await run("deploy-wpirm", {
    token: "MADA",
  });

  const comptroller = await run("deploy-comptroller");

  const unitroller = await run("deploy-unitroller");

  const mada = await run("deploy-mada", {
    interestRateModel: mADAInterestRateModel.address,
    comptroller: comptroller.address,
  });

  const xrc20Delegate = await run("deploy-xerc20-delegate");

  const xrc20Delegator = await run("deploy-xerc20-delegator", {
    token: "USDC",
    interestRateModel: usdcInterestRateModel.address,
    implementation: xrc20Delegate.address,
    comptroller: comptroller.address,
  });

  // setting market prices
  const oracle = conf["SimplePriceOracle"];

  const signer = new ethers.Wallet(process.env.PK);

  const signer_provider = await signer.connect(
    new ethers.providers.JsonRpcProvider(network.config.url)
  );
  const oracleContract = new ethers.Contract(
    oracle,
    OracleABI,
    signer_provider
  );

  // const oracleContract = (
  //   await hre.ethers.getContractFactory("SimplePriceOracle")
  // ).attach(oracle);

  console.log("Setting underlying prices: ", oracleContract.address);

  // let gasLimit = await oracleContract.estimateGas.setUnderlyingPrice(
  //   xrc20Delegator.address,
  //   toBN("1")
  // );

  await oracleContract.setUnderlyingPrice(xrc20Delegator.address, toBN("1"), {
    gasLimit: 1000000,
    gasPrice: 900000,
  });

  console.log("HERE");
  // gasLimit = await oracleContract.estimateGas.setUnderlyingPrice(
  //   mada.address,
  //   toBN("0.38")
  // );

  await (
    await oracleContract.setUnderlyingPrice(mada.address, toBN("0.38"), {
      gasLimit: 1000000,
      gasPrice: 900000,
    })
  ).wait(3);

  console.log("Underlying prices set...");

  console.log(
    `${mada.address} => ${await oracleContract.getUnderlyingPrice(
      mada.address
    )}`
  );

  console.log(
    `${xrc20Delegator.address} => ${await oracleContract.getUnderlyingPrice(
      xrc20Delegator.address
    )}`
  );

  // Configure Gtroller contract
  console.log("Configuring deployments...");
  await (
    await await unitroller._setPendingImplementation(gtroller.address)
  ).wait(3);

  await (await Comptroller._become(unitroller.address)).wait(3);

  await (await Comptroller._setPriceOracle(oracle)).wait(3);

  await (await Comptroller._setLiquidationIncentive(toBN("0.08"))).wait(3);

  await (await Comptroller._supportMarket(xrc20Delegator.address)).wait(3);
  await (await Comptroller._supportMarket(mada.address)).wait(3);

  await (
    await Comptroller._setCollateralFactor(mada.address, toBN("0.7"))
  ).wait(3);
  await (
    await Comptroller._setCollateralFactor(xrc20Delegator.address, toBN("0.8"))
  ).wait(3);

  // Configure markets
  await (await mada._setReserveFactor(toBN("0.1"))).wait(3);

  await (await xrc20Delegator._setReserveFactor(toBN("0.1"))).wait(3);

  console.log("❤⭕❤");
});
