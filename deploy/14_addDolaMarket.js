module.exports = async ({
    deployments,
    getNamedAccounts,
  }) => {
    console.log("14. Add Dola Market")
    const {execute} = deployments;
    const {deployer} = await getNamedAccounts()
    const Unitroller = await deployments.get('Unitroller');

    await execute('Comptroller', {
        from: deployer,
        to: Unitroller.address
    },
        "_supportMarket",
        (await deployments.get('anDola')).address
    )
    return true
  };

module.exports.id = 'addDolaMarket'
module.exports.tags = ['addDolaMarket'];
module.exports.dependencies = ['Unitroller', 'anDola'];