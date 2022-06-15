// SPDX-License-Identifier: BSD-3-Clause
pragma solidity ^0.8.10;

/*** Maker Interfaces ***/

interface PotLike {
    function chi() external view returns (uint);
    function dsr() external view returns (uint);
    function rho() external view returns (uint);
    function pie(address) external view returns (uint);
    function drip() external returns (uint);
    function join(uint) external;
    function exit(uint) external;
}

/*** Maker Interfaces for CDaiDelegate.sol ***/

interface GemLike {
    function approve(address, uint) external;
    function balanceOf(address) external view returns (uint);
    function transferFrom(address, address, uint) external returns (bool);
}

interface VatLike {
    function dai(address) external view returns (uint);
    function hope(address) external;
}

interface DaiJoinLike {
    function vat() external returns (VatLike);
    function dai() external returns (GemLike);
    function join(address, uint) external payable;
    function exit(address, uint) external;
}
