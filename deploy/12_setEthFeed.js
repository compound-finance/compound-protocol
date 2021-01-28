module.exports = async ({
    deployments,
    getNamedAccounts
  }) => {
    console.log("12. Set ETH price feed")
    const {execute} = deployments;
    const {deployer, ethFeed} = await getNamedAccounts()
    await execute('Oracle', {
        from: deployer,
    },
        "setFeed",
        (await deployments.get('anETH')).address,
        ethFeed,
        18
    )
    return true
  };

module.exports.id = 'setEthFeed';
module.exports.tags = ['setEthFeed'];
module.exports.dependencies = ['Oracle', 'anETH'];