module.exports = async ({
    deployments,
    getNamedAccounts,
  }) => {
    console.log("15. Add ETH Market")
    const {execute} = deployments;
    const {deployer} = await getNamedAccounts()
    const Unitroller = await deployments.get('Unitroller');

    await execute('Comptroller', {
        from: deployer,
        to: Unitroller.address
    },
        "_supportMarket",
        (await deployments.get('anETH')).address
    )
    return true
  };

module.exports.id = 'addEthMarket'
module.exports.tags = ['addEthMarket'];
module.exports.dependencies = ['Unitroller', 'anETH'];