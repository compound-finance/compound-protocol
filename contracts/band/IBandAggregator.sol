// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

interface IBandAggregator {

    function ref() external view returns (address);

    function getReferenceData(string memory _base, string memory _quote) external view returns (uint256, uint256, uint256);
}