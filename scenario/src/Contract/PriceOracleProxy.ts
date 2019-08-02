import {Contract} from '../Contract';
import {Callable, Sendable} from '../Invokation';

interface PriceOracleProxyMethods {
  getUnderlyingPrice(asset: string): Callable<number>
}

export interface PriceOracleProxy extends Contract {
  methods: PriceOracleProxyMethods
}
