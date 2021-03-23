import { Contract } from '../Contract';
import { Callable, Sendable } from '../Invokation';
import { encodedNumber } from '../Encoding';

interface ControllerImplMethods {
  _become(
    controller: string,
    priceOracle?: string,
    maxAssets?: encodedNumber,
    closeFactor?: encodedNumber,
    reinitializing?: boolean
  ): Sendable<string>;

  _become(
    controller: string,
    vtxRate: encodedNumber,
    vtxMarkets: string[],
    otherMarkets: string[]
  ): Sendable<string>;
}

export interface ControllerImpl extends Contract {
  methods: ControllerImplMethods;
}
