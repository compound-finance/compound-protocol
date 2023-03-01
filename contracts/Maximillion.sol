// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

import "./XMada.sol";

/**
 * @title Compound's Maximillion Contract
 * @author Compound
 */
contract Maximillion {
    /**
     * @notice The default   xMada market to repay in
     */
     XMada public   xMada;

    /**
     * @notice Construct a Maximillion to repay max in a  XMada market
     */
    constructor( XMada  xMada_) public {
          xMada =  xMada_;
    }

    /**
     * @notice msg.sender sends Ether to repay an account's borrow in the   xMada market
     * @dev The provided Ether is applied towards the borrow balance, any excess is refunded
     * @param borrower The address of the borrower account to repay on behalf of
     */
    function repayBehalf(address borrower) public payable {
        repayBehalfExplicit(borrower,   xMada);
    }

    /**
     * @notice msg.sender sends Ether to repay an account's borrow in a   xMada market
     * @dev The provided Ether is applied towards the borrow balance, any excess is refunded
     * @param borrower The address of the borrower account to repay on behalf of
     * @param  xMada_ The address of the   xMada contract to repay in
     */
    function repayBehalfExplicit(address borrower,  XMada  xMada_) public payable {
        uint received = msg.value;
        uint borrows =  xMada_.borrowBalanceCurrent(borrower);
        if (received > borrows) {
             xMada_.repayBorrowBehalf{value: borrows}(borrower);
            payable(msg.sender).transfer(received - borrows);
        } else {
             xMada_.repayBorrowBehalf{value: received}(borrower);
        }
    }
}
