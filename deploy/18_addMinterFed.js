module.exports = async ({
    deployments,
    getNamedAccounts,
  }) => {
    console.log("18. Add Fed as Minter")
    const {execute} = deployments;
    const {deployer} = await getNamedAccounts()

    await execute('Dola', {
        from: deployer
    },
        "addMinter",
        (await deployments.get('Fed')).address
    )
    return true
  };
module.exports.id = 'addMinterFed'
module.exports.tags = ['addMinterFed'];
module.exports.dependencies = ['Dola', 'Fed'];