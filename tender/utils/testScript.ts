import {mint, borrow, redeem, repayBorrow, liquidateBorrow, getAccountSnapshot, getAccountLiquidity, setFactorsAndThresholds, readMarketData, readBorrowAllowed } from "./cToken";
import {approve } from "./approve";
import {mockUpdatePrice, getUnderlyingPrice } from "./setPrice";


const deployments = {
  "Unitroller": "0x117e3F342886E18674e50Ea88633F9BE11273520",
  "Comptroller": "0xfeF89beE2C4684163E502e50fDb815a0088AB78B",
  "PriceOracle": "0xc2E597bec496ed2c4b8D9fFaF9e01346ba20ceB5",
  "IRModels": {
    "JumpRateModelV2": "0x49c67df0d856785739a2e454aa4921d63a51be13"
  },
  "tUSDT_delegate": "0x0fc8FE15649fB8fB728b3518c30045eBDDA60a4e",
  "tUSDT": "0x563f68d143000e1a24C47cBF2d7f0602A7622DCc",
  "tUSDC_delegate": "0x2A604F80fFc55924E6Be962C8D693660E8be7491",
  "tUSDC": "0x668791FBBD01C77cF71d437D3eDe173AF78F4E2C",
  "tfsGLPunderlying": "0x1addd80e6039594ee970e5872d247bf0414c8903",
  "tWBTCunderlying": "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
  "tUSDCunderlying": "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
  "tUSDTunderlying": "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
  "liqTester": "0xF2eD6e73ABB95456fa29868d310713405867664F"

}

async function main(){
  
    //await approve(deployments.tUSDCunderlying, deployments.tUSDC, ethers.utils.parseUnits("1", 6));
    //await mint(deployments.tUSDC, ethers.utils.parseUnits("1", 6));
    //await redeem(deployments.tUSDC, ethers.utils.parseUnits("1", 6));

    //await approve(deployments.tUSDTunderlying, deployments.tUSDT, ethers.utils.parseUnits("1", 6));
    //await mint(deployments.tUSDT, ethers.utils.parseUnits("1", 6));
    //await redeem(deployments.tUSDT, ethers.utils.parseUnits("1", 6));

    //await approve(deployments.tWBTCunderlying, deployments.tWBTC, ethers.utils.parseUnits("1", 3));
    //await mint(deployments.tWBTC, ethers.utils.parseUnits("1", 3));
    //await redeem(deployments.tWBTC, ethers.utils.parseUnits("2", 3));

    await borrow(deployments.tUSDT, ethers.utils.parseUnits("1", 6));

    //await approve(deployments.tUSDTunderlying, deployments.tUSDT, ethers.utils.parseUnits("1", 6));
    //await repayBorrow(deployments.tUSDT, ethers.utils.parseUnits("1", 6));

    //await mockUpdatePrice(deployments.tUSDC, 100)
    //await mockUpdatePrice(deployments.tUSDT, 100)

    //await getUnderlyingPrice(deployments.tWBTC)
    //await borrow(deployments.tWBTC, amount);

    //await getAccountSnapshot(deployments.tUSDC, deployments.liqTester);
    //await getAccountSnapshot(deployments.tUSDT, deployments.liqTester);

    //await getAccountLiquidity(deployments.Unitroller, deployments.liqTester);

    //await setFactorsAndThresholds(deployments.Unitroller, deployments.tUSDC, ethers.utils.parseUnits("80", 16), ethers.utils.parseUnits("85", 16), ethers.utils.parseUnits("90", 16), ethers.utils.parseUnits("95", 16))
    //await setFactorsAndThresholds(deployments.Unitroller, deployments.tUSDT, ethers.utils.parseUnits("80", 16), ethers.utils.parseUnits("85", 16), ethers.utils.parseUnits("90", 16), ethers.utils.parseUnits("95", 16))
    
    //await readMarketData(deployments.Unitroller, deployments.tUSDC);

    //await readBorrowAllowed(deployments.Unitroller, deployments.tUSDT, deployments.liqTester, ethers.utils.parseUnits("5", 5));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });