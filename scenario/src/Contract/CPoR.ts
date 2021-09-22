import { Contract } from '../Contract';
import { CTokenMethods } from './CToken';
import { Callable, Sendable } from '../Invokation';
import { encodedNumber } from '../Encoding';

export interface CPoRMethods extends CTokenMethods {
  feed(): Callable<string>;
  _setFeed(address: string): Sendable<number>;
  _setHeartbeat(amount: encodedNumber): Sendable<number>;
}

export interface CPoR extends Contract {
  methods: CPoRMethods;
  name: string;
}
