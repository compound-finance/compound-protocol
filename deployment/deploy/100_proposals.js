const submitProposals = async () => {
  console.log('proposals', global.timelockProposals || []);
};

submitProposals.id = "100_proposals";

module.exports = submitProposals;