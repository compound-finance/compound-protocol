
async function getAllContractNames(hre) {
  return Object.keys(await hre.deployments.all());
}

async function getDeploymentContractName(deploymentName) {
  const deployment = await hre.deployments.get(deploymentName);

  const contractNames = Object.values(JSON.parse(deployment.metadata).settings.compilationTarget);

  if (contractNames.length !== 1) {
    throw new Error('Found more than one contract for deployment');
  }

  return contractNames[0];
}


module.exports = {
  getAllContractNames,
  getDeploymentContractName,
};