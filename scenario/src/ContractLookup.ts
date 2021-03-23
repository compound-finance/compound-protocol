import { Map } from 'immutable';

import { Event } from './Event';
import { World } from './World';
import { Contract } from './Contract';
import { mustString } from './Utils';

import { VErc20Delegate } from './Contract/VErc20Delegate';
import { Vtx } from './Contract/Vtx';
import { Controller } from './Contract/Controller';
import { ControllerImpl } from './Contract/ControllerImpl';
import { VToken } from './Contract/VToken';
import { Governor } from './Contract/Governor';
import { Erc20 } from './Contract/Erc20';
import { InterestRateModel } from './Contract/InterestRateModel';
import { PriceOracle } from './Contract/PriceOracle';
import { Timelock } from './Contract/Timelock';
import { AnchoredView } from './Contract/AnchoredView';

type ContractDataEl = string | Map<string, object> | undefined;

function getContractData(world: World, indices: string[][]): ContractDataEl {
  return indices.reduce((value: ContractDataEl, index) => {
    if (value) {
      return value;
    } else {
      return index.reduce((data: ContractDataEl, el) => {
        let lowerEl = el.toLowerCase();

        if (!data) {
          return;
        } else if (typeof data === 'string') {
          return data;
        } else {
          return (data as Map<string, ContractDataEl>).find((_v, key) => key.toLowerCase().trim() === lowerEl.trim());
        }
      }, world.contractData);
    }
  }, undefined);
}

function getContractDataString(world: World, indices: string[][]): string {
  const value: ContractDataEl = getContractData(world, indices);

  if (!value || typeof value !== 'string') {
    throw new Error(
      `Failed to find string value by index (got ${value}): ${JSON.stringify(
        indices
      )}, index contains: ${JSON.stringify(world.contractData.toJSON())}`
    );
  }

  return value;
}

export function getWorldContract<T>(world: World, indices: string[][]): T {
  const address = getContractDataString(world, indices);

  return getWorldContractByAddress<T>(world, address);
}

export function getWorldContractByAddress<T>(world: World, address: string): T {
  const contract = world.contractIndex[address.toLowerCase()];

  if (!contract) {
    throw new Error(
      `Failed to find world contract by address: ${address}, index contains: ${JSON.stringify(
        Object.keys(world.contractIndex)
      )}`
    );
  }

  return <T>(<unknown>contract);
}

export async function getTimelock(world: World): Promise<Timelock> {
  return getWorldContract(world, [['Contracts', 'Timelock']]);
}

export async function getUnitroller(world: World): Promise<Controller> {
  return getWorldContract(world, [['Contracts', 'Unitroller']]);
}

export async function getMaximillion(world: World): Promise<Controller> {
  return getWorldContract(world, [['Contracts', 'Maximillion']]);
}

export async function getController(world: World): Promise<Controller> {
  return getWorldContract(world, [['Contracts', 'Controller']]);
}

export async function getControllerImpl(world: World, controllerImplArg: Event): Promise<ControllerImpl> {
  return getWorldContract(world, [['Controller', mustString(controllerImplArg), 'address']]);
}

export function getVTokenAddress(world: World, vTokenArg: string): string {
  return getContractDataString(world, [['vTokens', vTokenArg, 'address']]);
}

export function getVTokenDelegateAddress(world: World, vTokenDelegateArg: string): string {
  return getContractDataString(world, [['VTokenDelegate', vTokenDelegateArg, 'address']]);
}

export function getErc20Address(world: World, erc20Arg: string): string {
  return getContractDataString(world, [['Tokens', erc20Arg, 'address']]);
}

export function getGovernorAddress(world: World, governorArg: string): string {
  return getContractDataString(world, [['Contracts', governorArg]]);
}

export async function getPriceOracleProxy(world: World): Promise<PriceOracle> {
  return getWorldContract(world, [['Contracts', 'PriceOracleProxy']]);
}

export async function getAnchoredView(world: World): Promise<AnchoredView> {
  return getWorldContract(world, [['Contracts', 'AnchoredView']]);
}

export async function getPriceOracle(world: World): Promise<PriceOracle> {
  return getWorldContract(world, [['Contracts', 'PriceOracle']]);
}

export async function getVtx(
  world: World,
  vtxArg: Event
): Promise<Vtx> {
  return getWorldContract(world, [['Vtx', 'address']]);
}

export async function getVtxData(
  world: World,
  vtxArg: string
): Promise<[Vtx, string, Map<string, string>]> {
  let contract = await getVtx(world, <Event>(<any>vtxArg));
  let data = getContractData(world, [['Vtx', vtxArg]]);

  return [contract, vtxArg, <Map<string, string>>(<any>data)];
}

export async function getGovernorData(
  world: World,
  governorArg: string
): Promise<[Governor, string, Map<string, string>]> {
  let contract = getWorldContract<Governor>(world, [['Governor', governorArg, 'address']]);
  let data = getContractData(world, [['Governor', governorArg]]);

  return [contract, governorArg, <Map<string, string>>(<any>data)];
}

export async function getInterestRateModel(
  world: World,
  interestRateModelArg: Event
): Promise<InterestRateModel> {
  return getWorldContract(world, [['InterestRateModel', mustString(interestRateModelArg), 'address']]);
}

export async function getInterestRateModelData(
  world: World,
  interestRateModelArg: string
): Promise<[InterestRateModel, string, Map<string, string>]> {
  let contract = await getInterestRateModel(world, <Event>(<any>interestRateModelArg));
  let data = getContractData(world, [['InterestRateModel', interestRateModelArg]]);

  return [contract, interestRateModelArg, <Map<string, string>>(<any>data)];
}

export async function getErc20Data(
  world: World,
  erc20Arg: string
): Promise<[Erc20, string, Map<string, string>]> {
  let contract = getWorldContract<Erc20>(world, [['Tokens', erc20Arg, 'address']]);
  let data = getContractData(world, [['Tokens', erc20Arg]]);

  return [contract, erc20Arg, <Map<string, string>>(<any>data)];
}

export async function getVTokenData(
  world: World,
  vTokenArg: string
): Promise<[VToken, string, Map<string, string>]> {
  let contract = getWorldContract<VToken>(world, [['vTokens', vTokenArg, 'address']]);
  let data = getContractData(world, [['VTokens', vTokenArg]]);

  return [contract, vTokenArg, <Map<string, string>>(<any>data)];
}

export async function getVTokenDelegateData(
  world: World,
  vTokenDelegateArg: string
): Promise<[VErc20Delegate, string, Map<string, string>]> {
  let contract = getWorldContract<VErc20Delegate>(world, [['VTokenDelegate', vTokenDelegateArg, 'address']]);
  let data = getContractData(world, [['VTokenDelegate', vTokenDelegateArg]]);

  return [contract, vTokenDelegateArg, <Map<string, string>>(<any>data)];
}

export async function getControllerImplData(
  world: World,
  controllerImplArg: string
): Promise<[ControllerImpl, string, Map<string, string>]> {
  let contract = await getControllerImpl(world, <Event>(<any>controllerImplArg));
  let data = getContractData(world, [['Controller', controllerImplArg]]);

  return [contract, controllerImplArg, <Map<string, string>>(<any>data)];
}

export function getAddress(world: World, addressArg: string): string {
  if (addressArg.toLowerCase() === 'zero') {
    return '0x0000000000000000000000000000000000000000';
  }

  if (addressArg.startsWith('0x')) {
    return addressArg;
  }

  let alias = Object.entries(world.settings.aliases).find(
    ([alias, addr]) => alias.toLowerCase() === addressArg.toLowerCase()
  );
  if (alias) {
    return alias[1];
  }

  let account = world.accounts.find(account => account.name.toLowerCase() === addressArg.toLowerCase());
  if (account) {
    return account.address;
  }

  return getContractDataString(world, [
    ['Contracts', addressArg],
    ['vTokens', addressArg, 'address'],
    ['VTokenDelegate', addressArg, 'address'],
    ['Tokens', addressArg, 'address'],
    ['Controller', addressArg, 'address']
  ]);
}

export function getContractByName(world: World, name: string): Contract {
  return getWorldContract(world, [['Contracts', name]]);
}
