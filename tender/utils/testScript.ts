import {mint, borrow, redeem, repayBorrow, liquidateBorrow } from "./cToken";

async function main(){

    await mint(cTokenAddress, amount);


    await borrow(cTokenAddress, amount);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });