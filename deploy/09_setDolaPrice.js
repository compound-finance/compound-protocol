module.exports = async ({
    deployments,
    getNamedAccounts,
  }) => {
    console.log("9. set Dola fixed price")
    const {execute} = deployments;
    const {deployer} = await getNamedAccounts()

    await execute('Oracle', {
        from: deployer,
    },
        "setFixedPrice",
        (await deployments.get('anDola')).address,
        "1000000000000000000"
    )
    return true
  };
module.exports.id = 'setDolaPrice';
module.exports.tags = ['setDolaPrice'];
module.exports.dependencies = ['Oracle', 'anDola'];