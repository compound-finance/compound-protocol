const { expect } = require("chai");
const { smockit } = require('@eth-optimism/smock')

const FeedInterface = new ethers.utils.Interface([
    'function decimals() external view returns (uint8)',
    'function latestAnswer() external view returns (uint)'
])

describe("Oracle", function() {

    let oracle;

    it("Should set owner at deployment", async function() {
        const Oracle = await ethers.getContractFactory("Oracle");
        oracle = await Oracle.deploy();

        await oracle.deployed();
        expect(await oracle.owner()).to.equal((await ethers.getSigners())[0].address);
    });

    it("Should allow owner to set price feed", async function() {
        const CTOKEN = "0x0000000000000000000000000000000000000001"
        const feed = await smockit(FeedInterface)
        await oracle.setFeed(CTOKEN, feed.address, 8);
        expect((await oracle.feeds(CTOKEN))[0]).to.equal(feed.address);
        expect((await oracle.feeds(CTOKEN))[1]).to.equal(8);
    })

    it("Should not allow non-owners to set price feed", async function() {
        const CTOKEN = "0x0000000000000000000000000000000000000002"
        const feed = await smockit(FeedInterface)
        const [deployer, user] = await ethers.getSigners()
        oracle = oracle.connect(user)
        await expect(oracle.setFeed(CTOKEN, feed.address, 8)).to.be.revertedWith("ONLY OWNER");
        oracle = oracle.connect(deployer)
    })

    it("Should retrieve price from feed", async function() {
        const CTOKEN = "0x0000000000000000000000000000000000000003"
        const feed = await smockit(FeedInterface)
        await oracle.setFeed(CTOKEN, feed.address, 18);
        const input = "135808146155"
        const output = "1358081461550000000000"
        feed.smocked.decimals.will.return.with(8)
        feed.smocked.latestAnswer.will.return.with(input)
        expect(await oracle.getUnderlyingPrice(CTOKEN)).to.equal(output)
        await oracle.setFeed(CTOKEN, feed.address, 8);
        const input2 = "3537245298663"
        const output2 = "353724529866300000000000000000000"
        feed.smocked.decimals.will.return.with(8)
        feed.smocked.latestAnswer.will.return.with(input2)
        expect(await oracle.getUnderlyingPrice(CTOKEN)).to.equal(output2)
    })

    it("Should return 0 for unavailable prices", async function () {
        const CTOKEN = "0x0000000000000000000000000000000000000004"
        expect(await oracle.getUnderlyingPrice(CTOKEN)).to.equal(0)
    })

    it("Should allow owner to remove price feed", async function () {
        const CTOKEN = "0x0000000000000000000000000000000000000001"
        await oracle.removeFeed(CTOKEN);
        expect((await oracle.feeds(CTOKEN))[0]).to.equal(ethers.constants.AddressZero);
        expect((await oracle.feeds(CTOKEN))[1]).to.equal(0);
    })

    it("Should not allow non-owners to remove price feed", async function() {
        const CTOKEN = "0x0000000000000000000000000000000000000003"
        const [deployer, user] = await ethers.getSigners()
        oracle = oracle.connect(user)
        await expect(oracle.removeFeed(CTOKEN)).to.be.revertedWith("ONLY OWNER");
        oracle = oracle.connect(deployer)
    })

    it("Should allow owner to set fixed price", async function () {
        const CTOKEN = "0x0000000000000000000000000000000000000005"
        const price = "1000000000000000000"
        await oracle.setFixedPrice(CTOKEN, price);
        expect(await oracle.fixedPrices(CTOKEN)).to.equal(price)
        expect(await oracle.getUnderlyingPrice(CTOKEN)).to.equal(price)
    })

    it("Should not allow non-owner to set fixed price", async function () {
        const CTOKEN = "0x0000000000000000000000000000000000000005"
        const price = "1000000000000000000"
        const [deployer, user] = await ethers.getSigners()
        oracle = oracle.connect(user)
        await expect(oracle.setFixedPrice(CTOKEN, price)).to.be.revertedWith("ONLY OWNER");
        oracle = oracle.connect(deployer)
    })

    it("Should allow owner to remove fixed price", async function () {
        const CTOKEN = "0x0000000000000000000000000000000000000005"
        await oracle.removeFixedPrice(CTOKEN);
        expect(await oracle.fixedPrices(CTOKEN)).to.equal(0)
        expect(await oracle.getUnderlyingPrice(CTOKEN)).to.equal(0)
    })

    it("Should not allow non-owner to remove fixed price", async function () {
        const CTOKEN = "0x0000000000000000000000000000000000000005"
        const [deployer, user] = await ethers.getSigners()
        oracle = oracle.connect(user)
        await expect(oracle.removeFixedPrice(CTOKEN)).to.be.revertedWith("ONLY OWNER");
        oracle = oracle.connect(deployer)
    })

    it("Should not allow non-owner to change owner", async function() {
        const [deployer, user] = await ethers.getSigners()
        oracle = oracle.connect(user)
        await expect(oracle.changeOwner(ethers.constants.AddressZero)).to.be.revertedWith("ONLY OWNER");
        oracle = oracle.connect(deployer)
    })

    it("Should allow owner to change owner", async function() {
        await oracle.changeOwner(ethers.constants.AddressZero);
        expect(await oracle.owner()).to.equal(ethers.constants.AddressZero)
    })


});