import { Contract } from '../Contract';
import { Callable, Sendable } from '../Invokation';

interface UnitrollerMethods {
  admin(): Callable<string>;
  pendingAdmin(): Callable<string>;
  _acceptAdmin(): Sendable<number>;
  _setPendingAdmin(pendingAdmin: string): Sendable<number>;
  _setPendingImplementation(pendingImpl: string): Sendable<number>;
  controllerImplementation(): Callable<string>;
  pendingControllerImplementation(): Callable<string>;
}

export interface Unitroller extends Contract {
  methods: UnitrollerMethods;
}
