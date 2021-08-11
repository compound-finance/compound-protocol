let { loadConf } = require('./support/tokenConfig');

function printUsage() {
  console.log(`
usage: npx saddle script token:deploy {tokenConfig}

note: pass VERIFY=true and ETHERSCAN_API_KEY=<api key> to verify contract on Etherscan

example:

npx saddle -n mainnet script token:deploy '{
  "underlying": "0x514910771af9ca656af840dff83e8264ecf986ca",
  "comptroller": "$Comptroller",
  "interestRateModel": "0xd956188795ca6f4a74092ddca33e0ea4ca3a1395",
  "initialExchangeRateMantissa": "2.0e26",
  "name": "Compound ChainLink Token",
  "symbol": "cLINK",
  "decimals": "8",
  "admin": "$Timelock",
  "implementation": "0x24aa720906378bb8364228bddb8cabbc1f6fe1ba",
  "becomeImplementationData": "0x"
}'
  `);
}

function sleep(timeout) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
}

(async function() {
  if (args.length !== 1) {
    return printUsage();
  }

  let conf = loadConf(args[0], addresses);
  if (!conf) {
    return printUsage();
  }

  console.log(`Deploying cToken with ${JSON.stringify(conf)}`);

  let deployArgs = [conf.underlying, conf.comptroller, conf.interestRateModel, conf.initialExchangeRateMantissa.toString(), conf.name, conf.symbol, conf.decimals, conf.admin, conf.implementation, conf.becomeImplementationData];
  let contract = await saddle.deploy('CErc20Delegator', deployArgs);

  console.log(`Deployed contract to ${contract._address}`);

  if (env['VERIFY']) {
    const etherscanApiKey = env['ETHERSCAN_API_KEY'];
    if (etherscanApiKey === undefined || etherscanApiKey.length === 0) {
      throw new Error(`ETHERSCAN_API_KEY must be set if using VERIFY flag...`);
    }

    console.log(`Sleeping for 30 seconds then verifying contract on Etherscan...`);
    await sleep(30000); // Give Etherscan time to learn about contract
    console.log(`Now verifying contract on Etherscan...`);

    await saddle.verify(etherscanApiKey, contract._address, 'CErc20Delegator', deployArgs, 0);
    console.log(`Contract verified at https://${network}.etherscan.io/address/${contract._address}`);
  }

  return {
    ...conf,
    address: contract._address
  };
})();
