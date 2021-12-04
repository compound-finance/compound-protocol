module.exports = async function deploy(name, options) {
    const { deploy } = deployments;
    const {
        deployer,
    } = await getNamedAccounts();

    if (options.skipIfSameBytecode) {
        const deployedContract = await deployments.getOrNull(name)

        if (deployedContract) {
            const artifact = await deployments.getArtifact(options.contract || name)

            if (deployedContract.bytecode === artifact.bytecode) {
                if (options.log) {
                    console.log(`reusing "${name}" at ${deployedContract.address}`);
                }
    
                return {
                    ...deployedContract,
                    newlyDeployed: false,
                }
            }
        }
    }

    const result = await deploy(name, {
        from: deployer,
        confirmations: 2,
        log: true,
        ...options,
    })

    return result
}