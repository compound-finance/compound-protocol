const { getAllContractNames } = require("./deployment");

async function verifyContract(deploymentName) {
    const deployment = await hre.deployments.get(deploymentName)

    try {
        await hre.run("verify:verify", {
            address: deployment.address,
            constructorArguments: deployment.args,
        });
    } catch(err) {
        if (err.message.toLowerCase().includes('already verified')) {
            console.log(err.message)
            return
        }

        throw err
    }
}

async function verifyAllContracts(_taskArguments, hre) {
    const deployments = await getAllContractNames(hre);

    for (let i = 0; i < deployments.length; i++) {
        const deploymentName = deployments[i]
        console.log('verifiying', deploymentName)

        await verifyContract(deploymentName)
    }
}

module.exports = {
    verifyAllContracts,
}