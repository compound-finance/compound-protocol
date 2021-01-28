module.exports = async ({
    deployments,
    getNamedAccounts,
  }) => {
    console.log("6. Deploy Dola")
    const {deploy, save} = deployments;
    const {deployer} = await getNamedAccounts()

    await deploy('ERC20', {
      from: deployer,
      args:[
          "Dola USD Stablecoin",
          "DOLA",
          18
      ]
    });

    const ERC20 = await deployments.get('ERC20');

    await save("Dola", ERC20);
  };

module.exports.tags = ['Dola'];