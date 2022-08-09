FROM ubuntu
RUN apt-get update && apt-get install -y git python3-dev g++ make nodejs wget npm  libudev-dev
RUN wget https://github.com/ethereum/solidity/releases/download/v0.8.10/solc-static-linux -O /bin/solc && chmod +x /bin/solc

RUN mkdir -p /compound-protocol
WORKDIR /compound-protocol

# First add deps
ADD ./package.json /compound-protocol
ADD ./yarn.lock /compound-protocol

RUN npm install -g yarn n && n

RUN yarn install --lock-file

# Then rest of code and build
ADD . /compound-protocol

ENV SADDLE_SHELL=/bin/sh
ENV SADDLE_CONTRACTS="contracts/*.sol contracts/**/*.sol"
RUN npx saddle compile
RUN yarn cache clean