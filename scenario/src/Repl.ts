import {ReplPrinter} from './Printer';
import {
  addInvariant,
  initWorld,
  IWeb3,
  loadInvokationOpts,
  loadDryRun,
  loadSettings,
  loadVerbose,
  World
} from './World';
import {Artifacts} from './Artifact';
import {throwAssert} from './Assert';
import {Macros} from './Macro';
import {formatEvent} from './Formatter';
import {complete} from './Completer';
import {loadContracts} from './Networks';
import {accountAliases, loadAccounts} from './Accounts';
import {getNetworkPath, readFile} from './File';
import {SuccessInvariant} from './Invariant/SuccessInvariant';
import {createInterface} from './HistoricReadline';
import {runCommand} from './Runner';
import {parse} from './Parser';
import Web3 from 'web3';
import {forkWeb3} from './Hypothetical';

import * as fs from 'fs';
import * as path from 'path';

const basePath = process.env.proj_root || process.cwd();
const baseScenarioPath = path.join(basePath, 'spec', 'scenario');
const baseNetworksPath = path.join(basePath, 'networks');

declare var web3: IWeb3;
declare var artifacts: Artifacts;

function questionPromise(rl): Promise<string> {
  return new Promise((resolve, reject) => {
    rl.question(" > ", (command) => {
      resolve(command);
    });
  });
}

async function loop(world, rl, macros): Promise<any> {
  let command = await questionPromise(rl);

  try {
    let newWorld = await runCommand(world, command, macros);

    return await loop(newWorld, rl, macros);
  } catch (err) {
    world.printer.printError(err);
    return await loop(world, rl, macros);
  }
}

function loadEnvVars(): object {
  return (process.env['env_vars'] || '').split(',').reduce((acc, keyValue) => {
    if (keyValue.length === 0) {
      return acc;
    } else {
      const [key, value] = keyValue.split('=');

      return {
        ...acc,
        [key]: value
      };
    }
  }, {});
}

async function repl(web3: IWeb3, artifacts: Artifacts): Promise<void> {
  // Uck, we need to load core macros :(
  const coreMacros = fs.readFileSync(path.join(baseScenarioPath, 'CoreMacros'), 'utf8');

  const macros = <Macros>parse(coreMacros, {startRule: 'macros'});

  let script = process.env['script'];

  let accounts: string[];

  let network = process.env['network'];

  if (!network) {
    throw new Error(`Missing required "network" env argument`);
  }

  let world;

  let rl = await createInterface({
    input: process.stdin,
    output: process.stdout,
    completer: (line) => complete(world, macros, line),
    path: getNetworkPath(basePath, network, '-history', null)
  });

  const verbose: boolean = !!process.env['verbose'];
  const hypothetical: boolean = !!process.env['hypothetical'];
  let printer = new ReplPrinter(rl, verbose);

  if (hypothetical) {
    const forkJsonPath = path.join(baseNetworksPath, `${network}-fork.json`);
    let forkJson;

    try {
      let forkJsonString = fs.readFileSync(forkJsonPath, 'utf8');
      forkJson = JSON.parse(forkJsonString);
    } catch (err) {
      throw new Error(`Cannot read fork configuration from \`${forkJsonPath}\`, ${err}`);
    }
    if (!forkJson['url']) {
      throw new Error(`Missing url in fork json`);
    }
    if (!forkJson['unlocked'] || !Array.isArray(forkJson.unlocked)) {
      throw new Error(`Missing unlocked in fork json`);
    }

    web3 = await forkWeb3(web3, forkJson.url, forkJson.unlocked);
    accounts = forkJson.unlocked;
    console.log(`Running on fork ${forkJson.url} with unlocked accounts ${forkJson.unlocked.join(', ')}`)
  } else {
    // Uck, we have to load accounts first...
    if (web3.currentProvider && web3.currentProvider.addresses && web3.currentProvider.addresses.length > 0) {
      // We have a wallet provider
      accounts = web3.currentProvider.addresses;
    } else {
      // Let's see if we have any unlocked accounts
      accounts = await (new Web3(web3.currentProvider)).eth.personal.getAccounts();
    }
  }

  let contractInfo: string[];
  world = await initWorld(throwAssert, printer, web3, artifacts, network, accounts, basePath);
  [world, contractInfo] = await loadContracts(world);
  world = loadInvokationOpts(world);
  world = loadVerbose(world);
  world = loadDryRun(world);
  world = await loadSettings(world);

  printer.printLine(`Network: ${network}`);

  if (accounts.length > 0) {
    printer.printLine(`Accounts:`);
    accounts.forEach((account, i) => {
      let aliases = world.settings.lookupAliases(account);
      aliases = aliases.concat(accountAliases(i));

      printer.printLine(`\t${account} (${aliases.join(',')})`)
    });
  }

  if (contractInfo.length > 0) {
    world.printer.printLine(`Contracts:`);
    contractInfo.forEach((info) => world.printer.printLine(`\t${info}`));
  }

  printer.printLine(`Available macros: ${Object.keys(macros).toString()}`);
  printer.printLine(``);

  if (script) {
    const combined = script.split(',').reduce((acc, script) => {
      printer.printLine(`Running script: ${script}...`);
      const envVars = loadEnvVars();
      if (hypothetical) {
        envVars['hypo'] = true;
      }
      const scriptData: string = fs.readFileSync(script).toString();

      if (Object.keys(envVars).length > 0) {
        printer.printLine(`Env Vars:`);
      }

      const replacedScript = Object.entries(envVars).reduce((data, [key, val]) => {
        printer.printLine(`\t${key}: ${val}`);

        return data.split(`$${key}`).join(val);
      }, scriptData);

      const finalScript = replacedScript.replace(new RegExp(/\$[\w_]+/, 'g'), 'Nothing');

      return [...acc, ...finalScript.split("\n")];
    }, <string[]>[]);

    return await combined.reduce(async (acc, command) => {
      return await runCommand(await acc, command, macros);
    }, Promise.resolve(world));
    printer.printLine(`Script complete.`);
  } else {
    await loop(world, rl, macros);
  }
}

export = function(callback) {
  repl(web3, artifacts).catch((err) => {
    console.error("Fatal error");
    console.error(err);
    callback();
  }).then(() => callback());
}
