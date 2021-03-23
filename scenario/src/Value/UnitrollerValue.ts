import { Event } from '../Event';
import { World } from '../World';
import { Unitroller } from '../Contract/Unitroller';
import { AddressV, Value } from '../Value';
import { Arg, Fetcher, getFetcherValue } from '../Command';
import { getUnitroller } from '../ContractLookup';

export async function getUnitrollerAddress(world: World, unitroller: Unitroller): Promise<AddressV> {
  return new AddressV(unitroller._address);
}

async function getUnitrollerAdmin(world: World, unitroller: Unitroller): Promise<AddressV> {
  return new AddressV(await unitroller.methods.admin().call());
}

async function getUnitrollerPendingAdmin(world: World, unitroller: Unitroller): Promise<AddressV> {
  return new AddressV(await unitroller.methods.pendingAdmin().call());
}

async function getControllerImplementation(world: World, unitroller: Unitroller): Promise<AddressV> {
  return new AddressV(await unitroller.methods.controllerImplementation().call());
}

async function getPendingControllerImplementation(world: World, unitroller: Unitroller): Promise<AddressV> {
  return new AddressV(await unitroller.methods.pendingControllerImplementation().call());
}

export function unitrollerFetchers() {
  return [
    new Fetcher<{ unitroller: Unitroller }, AddressV>(
      `
        #### Address

        * "Unitroller Address" - Returns address of unitroller
      `,
      'Address',
      [new Arg('unitroller', getUnitroller, { implicit: true })],
      (world, { unitroller }) => getUnitrollerAddress(world, unitroller)
    ),
    new Fetcher<{ unitroller: Unitroller }, AddressV>(
      `
        #### Admin

        * "Unitroller Admin" - Returns the admin of Unitroller contract
          * E.g. "Unitroller Admin" - Returns address of admin
      `,
      'Admin',
      [new Arg('unitroller', getUnitroller, { implicit: true })],
      (world, { unitroller }) => getUnitrollerAdmin(world, unitroller)
    ),
    new Fetcher<{ unitroller: Unitroller }, AddressV>(
      `
        #### PendingAdmin

        * "Unitroller PendingAdmin" - Returns the pending admin of Unitroller contract
          * E.g. "Unitroller PendingAdmin" - Returns address of pendingAdmin
      `,
      'PendingAdmin',
      [new Arg('unitroller', getUnitroller, { implicit: true })],
      (world, { unitroller }) => getUnitrollerPendingAdmin(world, unitroller)
    ),
    new Fetcher<{ unitroller: Unitroller }, AddressV>(
      `
        #### Implementation

        * "Unitroller Implementation" - Returns the Implementation of Unitroller contract
          * E.g. "Unitroller Implementation" - Returns address of controllerImplentation
      `,
      'Implementation',
      [new Arg('unitroller', getUnitroller, { implicit: true })],
      (world, { unitroller }) => getControllerImplementation(world, unitroller)
    ),
    new Fetcher<{ unitroller: Unitroller }, AddressV>(
      `
        #### PendingImplementation

        * "Unitroller PendingImplementation" - Returns the pending implementation of Unitroller contract
          * E.g. "Unitroller PendingImplementation" - Returns address of pendingControllerImplementation
      `,
      'PendingImplementation',
      [new Arg('unitroller', getUnitroller, { implicit: true })],
      (world, { unitroller }) => getPendingControllerImplementation(world, unitroller)
    )
  ];
}

export async function getUnitrollerValue(world: World, event: Event): Promise<Value> {
  return await getFetcherValue<any, any>('Unitroller', unitrollerFetchers(), world, event);
}
