import {Contract} from '../Contract';
import {Callable, Sendable} from '../Invokation';
import {encodedNumber} from '../Encoding';

interface CTokenMethods {
  balanceOfUnderlying(string): Callable<number>
  borrowBalanceCurrent(string): Callable<string>
  borrowBalanceStored(string): Callable<string>
  totalBorrows(): Callable<string>
  totalBorrowsCurrent(): Callable<number>
  totalReserves(): Callable<string>
  reserveFactorMantissa(): Callable<string>
  comptroller(): Callable<string>
  exchangeRateStored(): Sendable<number>
  exchangeRateCurrent(): Callable<number>
  accrueInterest(): Sendable<number>
  mint(): Sendable<number>
  mint(encodedNumber): Sendable<number>
  redeem(encodedNumber): Sendable<number>
  redeemUnderlying(encodedNumber): Sendable<number>
  borrow(encodedNumber): Sendable<number>
  repayBorrow(): Sendable<number>
  repayBorrow(encodedNumber): Sendable<number>
  repayBorrowBehalf(string): Sendable<number>
  repayBorrowBehalf(string, encodedNumber): Sendable<number>
  liquidateBorrow(borrower: string, cTokenCollateral: string): Sendable<number>
  liquidateBorrow(borrower: string, repayAmount: encodedNumber, cTokenCollateral: string): Sendable<number>
  seize(liquidator: string, borrower: string, seizeTokens: encodedNumber): Sendable<number>
  evilSeize(treasure: string, liquidator: string, borrower: string, seizeTokens: encodedNumber): Sendable<number>
  _reduceReserves(encodedNumber): Sendable<number>
  _setReserveFactor(encodedNumber): Sendable<number>
  _setInterestRateModel(string): Sendable<number>
  _setComptroller(string): Sendable<number>
  underlying(): Callable<string>
  interestRateModel(): Callable<string>
  borrowRatePerBlock(): Callable<number>
  donate(): Sendable<void>
  admin(): Callable<string>
  pendingAdmin(): Callable<string>
  _setPendingAdmin(string): Sendable<number>
  _acceptAdmin(): Sendable<number>
}

interface CTokenScenarioMethods extends CTokenMethods {
  setTotalBorrows(encodedNumber): Sendable<void>
  setTotalReserves(encodedNumber): Sendable<void>
}

export interface CToken extends Contract {
  methods: CTokenMethods
  name: string
}

export interface CTokenScenario extends Contract {
  methods: CTokenScenarioMethods
  name: string
}
