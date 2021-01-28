module.exports = async ({
    deployments,
    getNamedAccounts,
  }) => {
    console.log("2. Deploy Comptroller")
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts()

    await deploy('Comptroller', {
      from: deployer
    });
  };

module.exports.tags = ['Comptroller'];