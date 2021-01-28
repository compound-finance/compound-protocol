module.exports = async ({
    deployments,
    getNamedAccounts
  }) => {
    console.log("17. Deploy Fed")
    const {deploy} = deployments;
    const {deployer, gov} = await getNamedAccounts();

    await deploy('Fed', {
      from: deployer,
      args:[
        (await deployments.get('anDola')).address,
        gov
      ]
    });
  };

  module.exports.tags = ['Fed'];
  module.exports.dependencies = ['anDola'];