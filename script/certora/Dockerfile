FROM openjdk:13-alpine

# Install solc
RUN wget https://github.com/ethereum/solidity/releases/download/v0.5.8/solc-static-linux -O /usr/bin/solc && chmod +x /usr/bin/solc

# Install bash & z3
RUN apk add bash z3
