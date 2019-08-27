module.exports = function() {
  web3.eth.net.getId().then((id) => console.error(id));
};