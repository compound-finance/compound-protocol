import * as path from 'path';
import * as crypto from 'crypto';
import {World} from './World';
import {Artifact} from './Artifact';
import {Invokation} from './Invokation';
import {ErrorReporter, NoErrorReporter} from './ErrorReporter';
import {getNetworkPath, readFile} from './File';

export interface ABIInput {
  name: string
  type: string
}

export interface ABIOutput {
  name: string
  type: string
}

export interface ABI {
  type: string
  name: string
  constant: boolean
  payable: boolean
  stateMutability: string
  inputs: ABIInput[]
  outputs: ABIOutput[]
}

export interface Raw {
  data: string
  topics: string[]
}

export interface Event {
  event: string
  signature: string | null
  address: string
  returnValues: object
  logIndex: number
  transactionIndex: number
  blockHash: string
  blockNumber: number
  raw: Raw
}

export interface Contract {
  _address: string
  name: string
  methods: any
  _jsonInterface: ABI[]
  constructorAbi?: string
  getPastEvents: (event: string, options: { filter: object, fromBlock: number, toBlock: number | string }) => Event[]
}

function randomAddress(): string {
  return crypto.randomBytes(20).toString('hex');
}

class ContractStub {
  name: string;
  cache: Artifact | null;
  test: boolean

  constructor(name: string, test: boolean) {
    this.name = name;
    this.cache = null;
    this.test = test;
  }

  async deploy<T>(world: World, from: string, args: any[]): Promise<Invokation<T>> {
    const opts = world.web3.currentProvider.opts || {};
    opts.from = from;

    let {networkContracts} = await getNetworkContracts(world);
    let networkContract = networkContracts[this.name];
    if (!networkContract) {
      throw new Error(`Cannot find contract ${this.name}, found: ${Object.keys(networkContracts)}`)
    }

    let invokationOpts = world.getInvokationOpts(opts);

    let contractAbi = JSON.parse(networkContract.abi);
    const contract = new world.web3.eth.Contract(contractAbi, null, opts);
    const constructorAbi = contractAbi.find((x) => x.type === 'constructor');
    let inputs;

    if (constructorAbi) {
      inputs = constructorAbi.inputs;
    } else {
      inputs = [];
    }

    const abi = world.web3.eth.abi.encodeParameters(inputs, args);

    try {
      let deployed;
      let deployReceipt;

      if (world.dryRun) {
        let addr = randomAddress();
        console.log(`Dry run: Deploying ${this.name} at fake address ${addr}`);
        deployed = {
          ...contract,
          _address: addr
        };
        deployed.options.address = addr;
        deployReceipt = {
          blockNumber: -1,
          transactionHash: "0x",
          events: {}
        };
      } else {
        deployed = await (contract.deploy({data: '0x' + networkContract.bin, arguments: args}).send(invokationOpts).on('receipt', (receipt) => (deployReceipt = receipt)));
        deployed.constructorAbi = abi;
      }

      return new Invokation<T>(deployed, deployReceipt, null, null);
    } catch (err) {
      return new Invokation<T>(null, null, err, null);
    }
  }

  at<T>(world: World, address: string): T {
    let artifact;

    if (!world.artifacts) {
      throw new Error(`Cannot deploy contracts with missing artifacts`);
    }

    if (this.cache) {
      artifact = this.cache;
    } else {
      artifact = world.artifacts.require(this.name);
      this.cache = artifact;
    }

    return new world.web3.eth.Contract(artifact._json.abi, address);
  }
}

export function getContract(name: string): ContractStub {
  return new ContractStub(name, false);
}

export function getTestContract(name: string): ContractStub {
  return new ContractStub(name, true);
}

export function setContractName(name: string, contract: Contract): Contract {
  contract.name = name;

  return contract;
}

export async function getPastEvents(world: World, contract: Contract, name: string, event: string, filter: object={}): Promise<Event[]> {
  const block = world.getIn(['contractData', 'Blocks', name]);
  if (!block) {
    throw new Error(`Cannot get events when missing deploy block for ${name}`);
  }

  return await contract.getPastEvents(event, { filter: filter, fromBlock: block, toBlock: 'latest' });
}

export async function decodeCall(world: World, contract: Contract, input: string): Promise<World> {
  if (input.slice(0, 2) === '0x') {
    input = input.slice(2);
  }

  let functionSignature = input.slice(0, 8);
  let argsEncoded = input.slice(8);

  let funsMapped = contract._jsonInterface.reduce((acc, fun) => {
    if (fun.type === 'function') {
      let functionAbi = `${fun.name}(${fun.inputs.map((i) => i.type).join(',')})`;
      let sig = world.web3.utils.sha3(functionAbi).slice(2, 10);

      return {
        ...acc,
        [sig]: fun
      };
    } else {
      return acc;
    }
  }, {});

  let abi = funsMapped[functionSignature];

  if (!abi) {
    throw new Error(`Cannot find function matching signature ${functionSignature}`);
  }

  let decoded = world.web3.eth.abi.decodeParameters(abi.inputs, argsEncoded);

  const args = abi.inputs.map((input) => {
    return `${input.name}=${decoded[input.name]}`;
  });
  world.printer.printLine(`\n${contract.name}.${abi.name}(\n\t${args.join("\n\t")}\n)`);

  return world;
}

export async function getNetworkContracts(world: World): Promise<{networkContracts: object, version: string}> {
  let fullContracts = await readFile(getNetworkPath(world.basePath, world.network, '-contracts', 'json'), null, JSON.parse);
  let version = fullContracts.version;
  let networkContracts = Object.entries(fullContracts.contracts).reduce((acc, [k, v]) => {
    let [path, contractName] = k.split(':');

    return {
      ...acc,
      [contractName]: {
        ...v,
        path: path
      }
    };
  }, {});

  return {
    networkContracts,
    version
  };
}
