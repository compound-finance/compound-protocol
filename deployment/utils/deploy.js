const hardhat = require("hardhat");
const {
  assertUpgradeIsSafe,
} = require("./storageLayout");

module.exports = async function deploy(name, options) {
  const {
    deploy
  } = deployments;
  const {
    deployer,
  } = await getNamedAccounts();

  if (!options.skipUpgradeSafety) {
    await assertUpgradeIsSafe(hardhat, options.contract || name, name);
  }

  if (options.skipIfSameBytecode) {
    const deployedContract = await deployments.getOrNull(name);

    if (deployedContract) {
      const artifact = await deployments.getArtifact(options.contract || name);

      if (deployedContract.bytecode === artifact.bytecode) {
        console.log(`Reusing "${name}" at ${deployedContract.address}`);

        return {
          ...deployedContract,
          newlyDeployed: false,
        };
      }
    }
  }

  const result = await deploy(name, {
    from: deployer,
    confirmations: 2,
    log: true,
    ...options,
  });

  return result;
};