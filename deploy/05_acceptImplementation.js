module.exports = async ({
    deployments,
    getNamedAccounts,
  }) => {
    console.log("5. acceptImplementation")
    const {execute} = deployments;
    const {deployer} = await getNamedAccounts()

    await execute('Comptroller', {
        from: deployer
    },
        "_become",
        (await deployments.get('Unitroller')).address
    )
    return true
  };
module.exports.id = 'acceptImplementation';
module.exports.tags = ['acceptImplementation'];
module.exports.dependencies = ['setPendingImplementation'];