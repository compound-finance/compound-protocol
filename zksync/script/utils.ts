import { HardhatRuntimeEnvironment } from "hardhat/types";
import { CTokenConfig, DeployConfig, PoolConfig } from "../script/types";

export function getChainId(hre: HardhatRuntimeEnvironment): number {
  const chainId: number | undefined = hre.network.config.chainId;

  if (typeof chainId === "undefined") {
    throw new Error("Chain ID is not defined");
  }

  return chainId;
}

export function getCTokenConfig(config: DeployConfig, pool: string, cToken: string): CTokenConfig {
  const poolConfig: PoolConfig | undefined = config?.pools?.find(
    (poolConfig: PoolConfig) => poolConfig.name === pool
  );


  const cTokenConfig: CTokenConfig | undefined = poolConfig?.markets?.find(
    (cTokenConfig: CTokenConfig) => cTokenConfig.underlying === cToken
  );

  if (cTokenConfig === undefined) throw new Error("CToken is not configured");

  return cTokenConfig;
}
