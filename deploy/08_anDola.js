module.exports = async ({
    deployments,
    getNamedAccounts
  }) => {
    console.log("8. Deploy anDola")
    const {deploy, save} = deployments;

    const Dola = await deployments.get('Dola');
    const Unitroller = await deployments.get('Unitroller');
    const Model = await deployments.get('DolaInterestRateModel');
    const {gov, deployer} = await getNamedAccounts();

    await deploy('CErc20Immutable', {
      from: deployer,
      args:[
        Dola.address,
        Unitroller.address,
        Model.address,
        "200000000000000000000000000",
        "Anchor Dola",
        "anDola",
        "8",
        gov
      ]
    });

    const CERC20 = await deployments.get('CErc20Immutable');
    await save("anDola", CERC20);
  };

module.exports.dependencies = ['DolaInterestRateModel','Dola', 'Unitroller'];
module.exports.tags = ['anDola'];