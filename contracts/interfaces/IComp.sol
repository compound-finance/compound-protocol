// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

interface CompInterface {
    function getPriorVotes(address account, uint blockNumber) external view returns (uint96);
}