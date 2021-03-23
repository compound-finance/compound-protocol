import { Contract } from '../Contract';
import { Sendable } from '../Invokation';
import { VTokenMethods, VTokenScenarioMethods } from './VToken';

interface VErc20DelegateMethods extends VTokenMethods {
  _becomeImplementation(data: string): Sendable<void>;
  _resignImplementation(): Sendable<void>;
}

interface VErc20DelegateScenarioMethods extends VTokenScenarioMethods {
  _becomeImplementation(data: string): Sendable<void>;
  _resignImplementation(): Sendable<void>;
}

export interface VErc20Delegate extends Contract {
  methods: VErc20DelegateMethods;
  name: string;
}

export interface VErc20DelegateScenario extends Contract {
  methods: VErc20DelegateScenarioMethods;
  name: string;
}
