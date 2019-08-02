import {Contract} from '../Contract';
import {Callable, Sendable} from '../Invokation';

interface UnitrollerMethods {
  admin(): Callable<string>
  _setPendingImplementation(string): Sendable<number>
  comptrollerImplementation(): Callable<string>
}

export interface Unitroller extends Contract {
  methods: UnitrollerMethods
}
