const { deployments } = require("hardhat");

module.exports = async function execute({
    contractName,
    deploymentName,
    methodName,
    args = [],
    forceProposal = false,
}) {
    const {
        deployer,
        multisig
    } = await getNamedAccounts();

    const deployment = await deployments.get(deploymentName || contractName)
    const contractFactory = await ethers.getContractFactory(contractName, deployer)
    const contract = contractFactory.attach(deployment.address)

    const admin = await contract.admin()

    if (!forceProposal && admin === deployer) {
        console.log(`running ${contractName}#${methodName}`)
        await contract[methodName](...args)
        return
    }

    // initialise the proposal array
    if (!global.timelockProposals) {
        global.timelockProposals = []
    }

    console.log(`scheduling ${contractName}#${methodName} for proposal`)
    global.timelockProposals.push({
        contractName,
        methodName,
        args,
    })
}