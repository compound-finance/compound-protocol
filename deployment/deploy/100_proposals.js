const submitProposals = async ({ getNamedAccounts, deployments }) => {
    console.log('proposals', global.timelockProposals || [])
}

submitProposals.id = "100_proposals";

module.exports = submitProposals;