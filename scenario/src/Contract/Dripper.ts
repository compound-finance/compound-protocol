import { Contract } from '../Contract';
import { encodedNumber } from '../Encoding';
import { Callable, Sendable } from '../Invokation';

export interface DripperMethods {
  drip(): Sendable<void>;
  dripped(): Callable<number>;
  dripStart(): Callable<number>;
  dripRate(): Callable<number>;
  token(): Callable<string>;
  target(): Callable<string>;
}

export interface Dripper extends Contract {
  methods: DripperMethods;
  name: string;
}
