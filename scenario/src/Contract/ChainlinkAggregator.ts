import { Contract } from "../Contract";
import { Callable, Sendable } from "../Invokation";
import { encodedNumber } from "../Encoding";

// Also includes MockV3Aggregator methods
interface ChainlinkAggregatorMethods {
  name(): Callable<string>;
  symbol(): Callable<string>;
  decimals(): Callable<string>;
  totalSupply(): Callable<number>;
  balanceOf(string): Callable<string>;
  allowance(owner: string, spender: string): Callable<string>;
  approve(address: string, amount: encodedNumber): Sendable<number>;
  allocateTo(address: string, amount: encodedNumber): Sendable<number>;
  transfer(address: string, amount: encodedNumber): Sendable<boolean>;
  transferFrom(
    owner: string,
    spender: string,
    amount: encodedNumber
  ): Sendable<boolean>;
  setFail(fail: boolean): Sendable<void>;
  pause(): Sendable<void>;
  unpause(): Sendable<void>;
  setParams(
    newBasisPoints: encodedNumber,
    maxFee: encodedNumber
  ): Sendable<void>;

  //
  // V2 Interface:
  //
  latestAnswer(): Callable<number>;
  latestTimestamp(): Callable<number>;
  latestRound(): Callable<number>;
  getAnswer(roundId: encodedNumber): Callable<number>;
  getTimestamp(roundId: encodedNumber): Callable<number>;

  //
  // V3 Interface:
  //
  decimals(): Callable<number>;
  description(): Callable<string>;
  version(): Callable<number>;

  // getRoundData and latestRoundData should both raise "No data present"
  // if they do not have data to report, instead of returning unset values
  // which could be misinterpreted as actual reported values.
  getRoundData(
    _roundId: encodedNumber
  ): Callable<[number, number, number, number, number]>;
  latestRoundData(): Callable<[number, number, number, number, number]>;

  // Mocking methods
  updateAnswer(_answer: encodedNumber): Sendable<void>;

  updateRoundData(
    _roundId: encodedNumber,
    _answer: encodedNumber,
    _timestamp: encodedNumber,
    _startedAt: encodedNumber
  ): Sendable<void>;
}

export interface ChainlinkAggregator extends Contract {
  methods: ChainlinkAggregatorMethods;
  name: string;
}
