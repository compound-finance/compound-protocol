pragma solidity ^0.5.16;

import "./VEther.sol";

/**
 * @title Vortex's Maximillion Contract
 * @author Vortex
 */
contract Maximillion {
    /**
     * @notice The default vEther market to repay in
     */
    VEther public vEther;

    /**
     * @notice Construct a Maximillion to repay max in a VEther market
     */
    constructor(VEther vEther_) public {
        vEther = vEther_;
    }

    /**
     * @notice msg.sender sends Ether to repay an account's borrow in the vEther market
     * @dev The provided Ether is applied towards the borrow balance, any excess is refunded
     * @param borrower The address of the borrower account to repay on behalf of
     */
    function repayBehalf(address borrower) public payable {
        repayBehalfExplicit(borrower, vEther);
    }

    /**
     * @notice msg.sender sends Ether to repay an account's borrow in a vEther market
     * @dev The provided Ether is applied towards the borrow balance, any excess is refunded
     * @param borrower The address of the borrower account to repay on behalf of
     * @param vEther_ The address of the vEther contract to repay in
     */
    function repayBehalfExplicit(address borrower, VEther vEther_) public payable {
        uint received = msg.value;
        uint borrows = vEther_.borrowBalanceCurrent(borrower);
        if (received > borrows) {
            vEther_.repayBorrowBehalf.value(borrows)(borrower);
            msg.sender.transfer(received - borrows);
        } else {
            vEther_.repayBorrowBehalf.value(received)(borrower);
        }
    }
}
