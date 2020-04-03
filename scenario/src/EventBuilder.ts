import { Event } from './Event';
import { addAction, World } from './World';
import { Governor } from './Contract/Governor';
import { Invokation } from './Invokation';
import { Arg, Command, Fetcher, getFetcherValue, processCommandEvent, View } from './Command';
import { storeAndSaveContract } from './Networks';
import { Contract, getContract } from './Contract';
import { getWorldContract } from './ContractLookup';
import { mustString } from './Utils';
import { Callable, Sendable } from './Invokation';
import {
  AddressV,
  ArrayV,
  EventV,
  NumberV,
  StringV,
  Value
} from './Value';
import {
  getAddressV,
  getArrayV,
  getEventV,
  getNumberV,
  getStringV,
} from './CoreValue';
import { AbiItem, AbiInput } from 'web3-utils';

export interface ContractData<T> {
  invokation: Invokation<T>;
  name: string;
  contract: string;
  address?: string;
}

async function getContractObject(world: World, event: Event): Promise<Contract> {
  return getWorldContract(world, [['Contracts', mustString(event)]]);
}

export function buildContractEvent<T extends Contract>(contractName: string) {
  let contractDeployer = getContract(contractName);

  async function build<T extends Contract>(
    world: World,
    from: string,
    params: Event
  ): Promise<{ world: World; contract: T; data: ContractData<T> }> {
    const fetchers = [
      new Fetcher<{ name: StringV }, ContractData<T>>(
        `
          #### ${contractName}

          * "${contractName} name:<String>=${contractName}" - Build ${contractName}
            * E.g. "${contractName} Deploy"
          }
        `,
        contractName,
        [
          new Arg('name', getStringV, { default: new StringV(contractName) })
        ],
        async (world, { name }) => {
          return {
            invokation: await contractDeployer.deploy<T>(world, from, []),
            name: name.val,
            contract: contractName
          };
        },
        { catchall: true }
      )
    ];

    let data = await getFetcherValue<any, ContractData<T>>(`Deploy${contractName}`, fetchers, world, params);
    let invokation = data.invokation;
    delete data.invokation;

    if (invokation.error) {
      throw invokation.error;
    }

    const contract = invokation.value!;
    contract.address = contract._address;
    const index = contractName == data.name ? [contractName] : [contractName, data.name];

    world = await storeAndSaveContract(
      world,
      contract,
      data.name,
      invokation,
      [
        { index: index, data: data }
      ]
    );

    return { world, contract, data };
  }

  async function deploy<T extends Contract>(world: World, from: string, params: Event) {
    let { world: nextWorld, contract, data } = await build<T>(world, from, params);
    world = nextWorld;

    world = addAction(
      world,
      `Deployed ${contractName} ${data.contract} to address ${contract._address}`,
      data.invokation
    );

    return world;
  }

  function commands<T extends Contract>() {
    return [
      new Command<{ params: EventV }>(`
          #### ${contractName}

          * "${contractName} Deploy" - Deploy ${contractName}
            * E.g. "Counter Deploy"
        `,
        "Deploy",
        [
          new Arg("params", getEventV, { variadic: true })
        ],
        (world, from, { params }) => deploy<T>(world, from, params.val)
      )
    ];
  }

  async function processEvent(world: World, event: Event, from: string | null): Promise<World> {
    return await processCommandEvent<any>(contractName, commands(), world, event, from);
  }

  let command = new Command<{ event: EventV }>(
    `
      #### ${contractName}

      * "${contractName} ...event" - Runs given ${contractName} event
      * E.g. "${contractName} Deploy"
    `,
    contractName,
    [new Arg('event', getEventV, { variadic: true })],
    (world, from, { event }) => {
      return processEvent(world, event.val, from);
    },
    { subExpressions: commands() }
  );

  return command;
}

export async function buildContractFetcher<T extends Contract>(world: World, contractName: string) {

  let abis: AbiItem[] = await world.saddle.abi(contractName);

  function fetchers() {
    const typeMappings = {
      address: {
        builder: (x) => new AddressV(x),
        getter: getAddressV
      },
      'address[]': {
        builder: (x) => new ArrayV<AddressV>(x),
        getter: (x) => getArrayV<AddressV>(x),
      },
      string: {
        builder: (x) => new StringV(x),
        getter: getStringV
      },
      uint256: {
        builder: (x) => new NumberV(x),
        getter: getNumberV
      },
      'uint256[]': {
        builder: (x) => new ArrayV<NumberV>(x),
        getter: (x) => getArrayV<NumberV>(x),
      },
      'uint32[]': {
        builder: (x) => new ArrayV<NumberV>(x),
        getter: (x) => getArrayV<NumberV>(x),
      },
      'uint96[]': {
        builder: (x) => new ArrayV<NumberV>(x),
        getter: (x) => getArrayV<NumberV>(x),
      }
    };

    function buildArg(name: string, input: AbiInput): Arg<Value> {
      let { getter } = typeMappings[input.type] || {};

      if (!getter) {
        throw new Error(`Unknown ABI Input Type: ${input.type} of \`${name}\` in ${contractName}`);
      }

      return new Arg(name, getter);
    }

    async function buildOutput(world: World, fn: string, inputs: object, output: AbiItem): Promise<Value> {
      const callable = <Callable<any>>(inputs['contract'].methods[fn](...Object.values(inputs).slice(1)));
      let value = await callable.call();
      let { builder } = typeMappings[output.type] || {};

      if (!builder) {
        throw new Error(`Unknown ABI Output Type: ${output.type} of \`${fn}\` in ${contractName}`);
      }

      return builder(value);
    }

    return abis.map((abi: any) => {
      function getEventName(s) {
        return s.charAt(0).toUpperCase() + s.slice(1);
      }

      let eventName = getEventName(abi.name);
      let inputNames = abi.inputs.map((input) => getEventName(input.name));
      let args = [
        new Arg("contract", getContractObject)
      ].concat(abi.inputs.map((input) => buildArg(abi.name, input)));

      return new Fetcher<object, Value>(`
          #### ${eventName}

          * "${eventName} ${inputNames.join(" ")}" - Returns the result of \`${abi.name}\` function
        `,
        eventName,
        args,
        (world, inputs) => buildOutput(world, abi.name, inputs, abi.outputs[0]),
        { namePos: 1 }
      )
    });
  }

  async function getValue(world: World, event: Event): Promise<Value> {
    return await getFetcherValue<any, any>(contractName, fetchers(), world, event);
  }


  let fetcher = new Fetcher<{ res: Value }, Value>(
    `
      #### ${contractName}

      * "${contractName} ...args" - Returns ${contractName} value
    `,
    contractName,
    [new Arg('res', getValue, { variadic: true })],
    async (world, { res }) => res,
    { subExpressions: fetchers() }
  )

  return fetcher;
}
