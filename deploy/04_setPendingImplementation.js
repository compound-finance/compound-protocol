module.exports = async ({
    deployments,
    getNamedAccounts,
  }) => {
    console.log("4. setPendingImplementation")
    const {execute} = deployments;
    const {deployer} = await getNamedAccounts()

    await execute('Unitroller', {
        from: deployer,
    },
        "_setPendingImplementation",
        (await deployments.get('Comptroller')).address
    )
    return true
  };

module.exports.id = 'setPendingImplementation';
module.exports.tags = ['setPendingImplementation'];
module.exports.dependencies = ['Unitroller'];