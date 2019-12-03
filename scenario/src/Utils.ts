import { Event } from './Event';
import { World } from './World';

// Wraps the element in an array, if it was not already an array
// If array is null or undefined, return the empty array
export function mustArray<T>(arg: T[] | T): T[] {
  if (Array.isArray(arg)) {
    return arg;
  } else {
    if (arg === null || arg === undefined) {
      return [];
    } else {
      return [arg];
    }
  }
}

// Asserts that the array must be given length and if so returns it, otherwise
// it will raise an error
export function mustLen(arg: any[] | any, len: number, maxLen?: number): any[] {
  if (!Array.isArray(arg)) {
    throw `Expected array of length ${len}, got ${arg}`;
  } else if (maxLen === undefined && arg.length !== len) {
    throw `Expected array of length ${len}, got length ${arg.length} (${arg})`;
  } else if (maxLen !== undefined && (arg.length < len || arg.length > maxLen)) {
    throw `Expected array of length ${len}-${maxLen}, got length ${arg.length} (${arg})`;
  } else {
    return arg;
  }
}

export function mustString(arg: Event): string {
  if (typeof arg === 'string') {
    return arg;
  }

  throw new Error(`Expected string argument, got ${arg.toString()}`);
}

// Web3 doesn't have a function ABI parser.. not sure why.. but we build a simple encoder
// that accepts "fun(uint256,uint256)" and params and returns the encoded value.
export function encodeABI(world: World, fnABI: string, fnParams: string[]): string {
  const regex = /(\w+)\(([\w,]+)\)/;
  const res = regex.exec(fnABI);
  if (!res) {
    throw new Error(`Expected ABI signature, got: ${fnABI}`);
  }
  const [_, fnName, fnInputs] = <[string, string, string]>(<unknown>res);
  const jsonInterface = {
    name: fnName,
    inputs: fnInputs.split(',').map(i => ({ name: '', type: i }))
  };
  return world.web3.eth.abi.encodeFunctionCall(jsonInterface, fnParams);
}

export function encodeParameters(world: World, fnABI: string, fnParams: string[]): string {
  const regex = /(\w+)\(([\w,]+)\)/;
  const res = regex.exec(fnABI);
  if (!res) {
    return '0x0';
  }
  const [_, __, fnInputs] = <[string, string, string]>(<unknown>res);
  return world.web3.eth.abi.encodeParameters(fnInputs.split(','), fnParams);
}

export function decodeParameters(world: World, fnABI: string, data: string): string[] {
  const regex = /(\w+)\(([\w,]+)\)/;
  const res = regex.exec(fnABI);
  if (!res) {
    return [];
  }
  const [_, __, fnInputs] = <[string, string, string]>(<unknown>res);
  const inputTypes = fnInputs.split(',');
  const parameters = world.web3.eth.abi.decodeParameters(inputTypes, data);

  return inputTypes.map((_, index) => parameters[index]);
}

export function sleep(timeout: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
}

export function sendRPC(world: World, method: string, params: any[]) {
  return new Promise((resolve, reject) => {
    world.web3.currentProvider.send(
      {
        jsonrpc: '2.0',
        method: method,
        params: params,
        id: new Date().getTime() // Id of the request; anything works, really
      },
      (err, response) => {
        if (err) {
          reject(err);
        } else {
          resolve(response);
        }
      }
    );
  });
}
