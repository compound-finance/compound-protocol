FROM mhart/alpine-node:11.10.1

RUN apk update && apk add --no-cache --virtual build-dependencies git python g++ make
RUN yarn global add truffle@5.0.30
RUN yarn global add ganache-cli@6.5.1
RUN yarn global add typescript

RUN wget https://github.com/ethereum/solidity/releases/download/v0.5.8/solc-static-linux -O /usr/local/bin/solc && \
	chmod +x /usr/local/bin/solc

RUN mkdir -p /deploy/compound-protocol/scenario
WORKDIR /deploy/compound-protocol

# First add deps
ADD ./package.json /deploy/compound-protocol/
ADD ./yarn.lock /deploy/compound-protocol/
RUN yarn install
ADD scenario/package.json /deploy/compound-protocol/scenario
ADD scenario/yarn.lock /deploy/compound-protocol/scenario
RUN ls -la /deploy/compound-protocol
RUN ls -la /deploy/compound-protocol/scenario
RUN cd /deploy/compound-protocol/scenario && yarn install

# Then rest of code and build
ADD . /deploy/compound-protocol

RUN truffle compile

RUN apk del build-dependencies
RUN yarn cache clean

CMD while :; do sleep 2073600; done
