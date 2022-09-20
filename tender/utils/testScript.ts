import {mint, borrow, redeem, repayBorrow, liquidateBorrow } from "./cToken";
import {approve } from "./approve";
import {mockUpdatePrice, getUnderlyingPrice } from "./setPrice";


const deployments = {
  "Unitroller": "0x068134C0916583787320BDAF4381509E83990499",
  "Comptroller": "0xd9Ac5843104801F23592892d33b2fDEd67C7932E",
  "PriceOracle": "0x9618E7Fe4b910D5EECDD7125Ff1bB1F7E67Ee76d",
  "delegate": "0x00872060e2c4Db7E6EF368e45f30d103c9656eb2",
  "IRModels": {
    "JumpRateModelV2": "0xc2BFe283Cef0F02C8DE50720e6Ac20c3B0D1a0ee"
  },
  "tfsGLP": "0x118C6fE960Ed8Bb50D722a0323BD676f2D1c3F40",
  "tWBTC": "0xDE131f422585927c5d19879Ee22241678273B155",
  "tUSDC": "0xbF0091AfE5F21907b59CE31f1288cFD9E43cBAf6",
  "tfsGLPunderlying": "0x1addd80e6039594ee970e5872d247bf0414c8903",
  "tWBTCunderlying": "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
  "tUSDCunderlying": "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
  "tUSDT": "0xB8a1C351347e38D20912609ac43d1f193b6E9a50",
  "tUSDTunderlying": "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"

}

async function main(){
    // await approve(deployments.tUSDCunderlying, deployments.tUSDC, ethers.utils.parseUnits("9", 6));
    // await mint(deployments.tUSDC, ethers.utils.parseUnits("10", 6));
    await redeem(deployments.tUSDC, ethers.utils.parseUnits("10", 6));

    // await approve(deployments.tUSDTunderlying, deployments.tUSDT, ethers.utils.parseUnits("1", 6));
    // await mint(deployments.tUSDT, ethers.utils.parseUnits("10", 6));
    // await redeem(deployments.tUSDT, ethers.utils.parseUnits("10", 6));

    // await approve(deployments.tWBTCunderlying, deployments.tWBTC, ethers.utils.parseUnits("1", 3));
    // await mint(deployments.tWBTC, ethers.utils.parseUnits("1", 3));
    // await redeem(deployments.tWBTC, ethers.utils.parseUnits("2", 3));

    // await mockUpdatePrice(deployments.tUSDC, 10000)
    // await mockUpdatePrice(deployments.tWBTC, 10000)

    // await getUnderlyingPrice(deployments.tWBTC)
    // await borrow(deployments.tWBTC, amount);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });