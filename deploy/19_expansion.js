module.exports = async ({
    deployments,
    getNamedAccounts,
  }) => {
    console.log("19. Fed expansion")
    const {execute} = deployments;
    const {deployer} = await getNamedAccounts()

    await execute('Fed', {
        from: deployer
    },
        "expansion",
        "1000000000000000000000000" // 1 million
    )
    return true
  };
module.exports.id = 'expansion'
module.exports.tags = ['expansion'];
module.exports.dependencies = ['Dola', 'Fed', 'addMinterFed'];