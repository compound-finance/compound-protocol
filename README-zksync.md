# Zoro Protocol

## Testing

### Prerequisites

It is required that you have `Docker` and `docker-compose` installed on your computer. Find the [installation guide here](https://docs.docker.com/get-docker/).

### Install the test environment

Download the local test environment for zkSync:

```bash
git clone https://github.com/matter-labs/local-setup.git
```

### Start the local nodes

```bash
cd local-setup
./start.sh
```

### Deploy test protocol

Set `ETH_PK` to `0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110` in `.env`.

Note: this private key is for a rich wallet configured by the zkSync local setup.

```bash
yarn zksync-deploy
```

### Run tests

```bash
yarn hardhat run scipts/zksync/test.ts
```

## Deployment

Note: you will need to set `ETH_PK` in `.env` with your private key.

```bash
yarn zksync-deploy
```
