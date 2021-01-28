module.exports = async ({
    deployments,
    getNamedAccounts,
  }) => {
    console.log("3. Deploy Unitroller")
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts()

    await deploy('Unitroller', {
      from: deployer
    });
  };

module.exports.tags = ['Unitroller'];
module.exports.dependencies = ['Comptroller'];