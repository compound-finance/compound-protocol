import * as path from "path";
import * as glob from "glob";
import { HardhatRuntimeEnvironment, RunSuperFunction } from "hardhat/types";
import { subtask } from "hardhat/config";
import { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } from "hardhat/builtin-tasks/task-names";

subtask(TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS).setAction(
  async (
    _,
    hre: HardhatRuntimeEnvironment,
    runSuper: RunSuperFunction<any>
  ) => {
    const paths = await runSuper();

    const directoryGlob = path.join(
      hre.config.paths.root,
      "zksync",
      "contracts",
      "**",
      "*.sol"
    );
    const zkPaths = glob.sync(directoryGlob);

    return [...paths, ...zkPaths];
  }
);
