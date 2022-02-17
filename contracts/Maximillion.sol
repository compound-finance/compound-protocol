pragma solidity ^0.5.16;

import "./CWrappedNative.sol";

/**
 * @title Compound's Maximillion Contract
 * @author Compound
 */
contract Maximillion {
    /**
     * @notice msg.sender sends Ether to repay an account's borrow in a cEther market
     * @dev The provided Ether is applied towards the borrow balance, any excess is refunded
     * @param borrower The address of the borrower account to repay on behalf of
     * @param cEther The address of the cEther contract to repay in
     */
    function repayBehalf(address borrower, CWrappedNative cEther) public payable {
        uint received = msg.value;
        uint borrows = cEther.borrowBalanceCurrent(borrower);
        if (received > borrows) {
            cEther.repayBorrowBehalfNative.value(borrows)(borrower);
            msg.sender.transfer(received - borrows);
        } else {
            cEther.repayBorrowBehalfNative.value(received)(borrower);
        }
    }
}
