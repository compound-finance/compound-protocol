import "hardhat/types/runtime";

declare module "hardhat/types/runtime" {
  export interface HardhatRuntimeEnvironment {
    getUnderlyingToken: (name: string) => string;
    getCTokenAddress: (name: string) => string;
    getMainAddress: (name: string) => string;
    recordMainAddress: (name: string, address: string) => void;
    recordTokenAddress: (name: string, address: string) => void;
    recordCTokenAddress: (name: string, address: string) => void;
  }
}
