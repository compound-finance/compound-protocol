import { Contract } from '../Contract';
import { Callable, Sendable } from '../Invokation';
import { VTokenMethods } from './VToken';
import { encodedNumber } from '../Encoding';

interface VErc20DelegatorMethods extends VTokenMethods {
  implementation(): Callable<string>;
  _setImplementation(
    implementation_: string,
    allowResign: boolean,
    becomImplementationData: string
  ): Sendable<void>;
}

interface VErc20DelegatorScenarioMethods extends VErc20DelegatorMethods {
  setTotalBorrows(amount: encodedNumber): Sendable<void>;
  setTotalReserves(amount: encodedNumber): Sendable<void>;
}

export interface VErc20Delegator extends Contract {
  methods: VErc20DelegatorMethods;
  name: string;
}

export interface VErc20DelegatorScenario extends Contract {
  methods: VErc20DelegatorMethods;
  name: string;
}
