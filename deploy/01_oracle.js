module.exports = async ({
    deployments,
    getNamedAccounts,
  }) => {
    console.log("1. Deploy Oracle")
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts()

    await deploy('Oracle', {
      from: deployer
    });
  };