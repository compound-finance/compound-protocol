module.exports = async ({
    deployments,
    getNamedAccounts,
  }) => {
    console.log("13. Attach Oracle to comptroller")
    const {execute} = deployments;
    const {deployer} = await getNamedAccounts()

    await execute('Comptroller', {
        from: deployer,
        to: (await deployments.get('Unitroller')).address
    },
        "_setPriceOracle",
        (await deployments.get('Oracle')).address
    )
    return true
  };

module.exports.id = 'setOracle'
module.exports.tags = ['setOracle'];
module.exports.dependencies = ['Unitroller', 'Oracle'];