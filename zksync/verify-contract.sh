#!/bin/bash
npx hardhat verify \
    --network zkSyncTestnet $1 \
    --contract "contracts/core/contracts/$2.sol:$2" \
    --constructor-args $3
