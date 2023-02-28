import { Contract } from "../Contract";
import { Callable, Sendable } from "../Invokation";
import { XTokenMethods } from "./XToken";
import { encodedNumber } from "../Encoding";

interface XErc20DelegatorMethods extends XTokenMethods {
  implementation(): Callable<string>;
  _setImplementation(
    implementation_: string,
    allowResign: boolean,
    becomImplementationData: string
  ): Sendable<void>;
}

interface XErc20DelegatorScenarioMethods extends XErc20DelegatorMethods {
  setTotalBorrows(amount: encodedNumber): Sendable<void>;
  setTotalReserves(amount: encodedNumber): Sendable<void>;
}

export interface XErc20Delegator extends Contract {
  methods: XErc20DelegatorMethods;
  name: string;
}

export interface XErc20DelegatorScenario extends Contract {
  methods: XErc20DelegatorMethods;
  name: string;
}
