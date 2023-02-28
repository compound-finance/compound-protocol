import { Contract } from "../Contract";
import { Sendable } from "../Invokation";
import { XTokenMethods, XTokenScenarioMethods } from "./XToken";

interface XErc20DelegateMethods extends XTokenMethods {
  _becomeImplementation(data: string): Sendable<void>;
  _resignImplementation(): Sendable<void>;
}

interface XErc20DelegateScenarioMethods extends XTokenScenarioMethods {
  _becomeImplementation(data: string): Sendable<void>;
  _resignImplementation(): Sendable<void>;
}

export interface XErc20Delegate extends Contract {
  methods: XErc20DelegateMethods;
  name: string;
}

export interface XErc20DelegateScenario extends Contract {
  methods: XErc20DelegateScenarioMethods;
  name: string;
}
