#!/bin/bash
cmd=( npx hardhat verify \
    --network zkSyncTestnet $1 \
    --contract "contracts/core/contracts/Lens/$2.sol:$2" )

if [ -n "$3" ]; then
    cmd+=( --constructor-args $3 )
fi

"${cmd[@]}"
