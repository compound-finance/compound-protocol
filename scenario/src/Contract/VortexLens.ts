import { Contract } from '../Contract';
import { encodedNumber } from '../Encoding';
import { Callable, Sendable } from '../Invokation';

export interface VortexLensMethods {
  vTokenBalances(vToken: string, account: string): Sendable<[string,number,number,number,number,number]>;
  vTokenBalancesAll(vTokens: string[], account: string): Sendable<[string,number,number,number,number,number][]>;
  vTokenMetadata(vToken: string): Sendable<[string,number,number,number,number,number,number,number,number,boolean,number,string,number,number]>;
  vTokenMetadataAll(vTokens: string[]): Sendable<[string,number,number,number,number,number,number,number,number,boolean,number,string,number,number][]>;
  vTokenUnderlyingPrice(vToken: string): Sendable<[string,number]>;
  vTokenUnderlyingPriceAll(vTokens: string[]): Sendable<[string,number][]>;
  getAccountLimits(controller: string, account: string): Sendable<[string[],number,number]>;
}

export interface VortexLens extends Contract {
  methods: VortexLensMethods;
  name: string;
}
