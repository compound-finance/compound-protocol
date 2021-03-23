FROM mhart/alpine-node:13.8.0

RUN apk update && apk add --no-cache --virtual build-dependencies bash git python g++ make perl perl-utils
RUN wget https://github.com/ethereum/solidity/releases/download/v0.5.16/solc-static-linux -O /bin/solc && chmod +x /bin/solc

RUN mkdir -p /vortex-protocol
WORKDIR /vortex-protocol

# First add deps
ADD ./package.json /vortex-protocol
ADD ./yarn.lock /vortex-protocol
RUN yarn install --frozen-lockfile

# Then rest of code and build
ADD . /vortex-protocol

ENV SADDLE_SHELL=/bin/sh
ENV SADDLE_CONTRACTS="contracts/*.sol contracts/**/*.sol"
RUN npx saddle compile

CMD while :; do sleep 2073600; done
