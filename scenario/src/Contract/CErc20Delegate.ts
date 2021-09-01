import { Contract } from '../Contract';
import { Sendable } from '../Invokation';
import { CTokenMethods, CTokenScenarioMethods } from './CToken';

interface CErc20DelegateMethods extends CTokenMethods {
  _becomeImplementation(data: string): Sendable<void>;
  _resignImplementation(): Sendable<void>;
}

interface CErc20DelegateScenarioMethods extends CTokenScenarioMethods {
  _becomeImplementation(data: string): Sendable<void>;
  _resignImplementation(): Sendable<void>;
}

interface CPoRScenarioMethods extends CErc20DelegateScenarioMethods {
  _setFeed(newFeed: string): Sendable<void>;
  _setHeartbeat(newHeartbeat: string): Sendable<void>;
}

export interface CErc20Delegate extends Contract {
  methods: CErc20DelegateMethods;
  name: string;
}

export interface CErc20DelegateScenario extends Contract {
  methods: CErc20DelegateScenarioMethods;
  name: string;
}
