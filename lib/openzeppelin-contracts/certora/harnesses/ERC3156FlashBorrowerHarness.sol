// SPDX-License-Identifier: MIT

import "../patched/interfaces/IERC3156FlashBorrower.sol";

pragma solidity ^0.8.0;

contract ERC3156FlashBorrowerHarness is IERC3156FlashBorrower {
    bytes32 somethingToReturn;

    function onFlashLoan(address, address, uint256, uint256, bytes calldata) external view override returns (bytes32) {
        return somethingToReturn;
    }
}
