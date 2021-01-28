module.exports = async ({
    deployments,
    getNamedAccounts
  }) => {
    console.log("11. Deploy anETH")
    const {deploy, save} = deployments;
    const {deployer, gov} = await getNamedAccounts()

    const Unitroller = await deployments.get('Unitroller');
    const Model = await deployments.get('EthInterestRateModel');

    await deploy('CEther', {
      from: deployer,
      args:[
        Unitroller.address,
        Model.address,
        "200000000000000000000000000",
        "Anchor Ether",
        "anETH",
        "8",
        gov
      ]
    });

    const CERC20 = await deployments.get('CEther');
    await save("anETH", CERC20);
  };

module.exports.dependencies = ['EthInterestRateModel', 'Unitroller'];
module.exports.tags = ['anETH'];