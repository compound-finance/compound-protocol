import { Contract, BigNumber } from "ethers";
import chai, { expect } from "chai";
import chaiBN from "chai-bn";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiBN(BigNumber));

export { expect };
