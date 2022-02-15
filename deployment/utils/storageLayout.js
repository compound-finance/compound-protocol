
// Inspired by https://github.com/OriginProtocol/origin-dollar/blob/master/contracts/tasks/storageSlots.js

const {
    promises,
} = require("fs");
const path = require("path");

const {
    assertStorageUpgradeSafe,
    getStorageLayout,
    getVersion,
    getUnlinkedBytecode,
    isCurrentValidationData,
} = require("@openzeppelin/upgrades-core");
const { getAllContractNames, getDeploymentContractName } = require("./deployment");

async function assertStorageLayoutChangeSafeForAll(_taskArguments, hre) {
    const allContracts = await getAllContractNames(hre);

    for (let i = 0; i < allContracts.length; i++) {
        await assertUpgradeIsSafe(hre, await getDeploymentContractName(allContracts[i]), allContracts[i]);
    }
}

async function assertUpgradeIsSafe(hre, contractName, deploymentName) {
    console.log(`Checking if contract ${deploymentName} is safe for upgrade`);

    const layout = await getStorageLayoutForContract(hre, contractName);
    const oldLayout = await loadPreviousStorageLayoutForContract(hre, deploymentName);

    if (!oldLayout) {
        console.debug(
            `Previous storage layout for ${deploymentName} not found. Treating ${deploymentName} as a new contract.`
        );
    } else {
        // 3rd param is opts.unsafeAllowCustomTypes
        assertStorageUpgradeSafe(oldLayout, layout, false);
        console.log(`Contract ${deploymentName} is safe for upgrade`);
    }
}

async function getStorageLayoutForContract(hre, contractName) {
    const validations = await readValidations(hre);
    const implFactory = await hre.ethers.getContractFactory(contractName);
    const unlinkedBytecode = getUnlinkedBytecode(
        validations,
        implFactory.bytecode
    );
    const version = getVersion(unlinkedBytecode, implFactory.bytecode);

    return getStorageLayout(validations, version);
}

async function loadPreviousStorageLayoutForContract(hre, contractName) {
    const deployment = await hre.deployments.getOrNull(contractName)

    if (!deployment) {
        return null
    }

    return deployment.storageLayout
}

async function readValidations(hre) {
    const cachePath = getValidationsCachePath(hre);
    try {
        const data = JSON.parse(await promises.readFile(cachePath, "utf8"));
        if (!isCurrentValidationData(data)) {
            await promises.unlink(cachePath);
            throw new ValidationsCacheOutdated();
        }
        return data;
    } catch (e) {
        if (e.code === "ENOENT") {
            throw new ValidationsCacheNotFound();
        } else {
            throw e;
        }
    }
}

function getValidationsCachePath(hre) {
    return path.join(hre.config.paths.cache, "validations.json");
}

module.exports = {
    assertStorageLayoutChangeSafeForAll,
    assertUpgradeIsSafe,
}