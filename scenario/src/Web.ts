import {parse} from './Parser';
import {IWeb3, World, initWorld} from './World';
import {throwAssert} from './Assert';
import {CallbackPrinter} from './Printer';
import {runCommand} from './Runner';
import {loadContractData, parseNetworkFile} from './Networks';

export async function webWorld(web3: IWeb3, networksData: string, networksABIData: string, printerCallback: (message: any) => void): Promise<World> {
	let printer = new CallbackPrinter(printerCallback);
	let accounts = [web3.currentProvider.address];
	let network = 'rinkeby'; // TODO: Get from web3

	let world = await initWorld(throwAssert, printer, web3, null, network, accounts, null);

	let networks = parseNetworkFile(networksData);
	let networksABI = parseNetworkFile(networksABIData);

	[world,] = await loadContractData(world, networks, networksABI);
	// world = loadInvokationOpts(world);
	// world = loadVerbose(world);
	// world = loadDryRun(world);
	// world = await loadSettings(world);

	return world;
}

export async function webParse(world: World, line: string): Promise<World> {
	return runCommand(world, line, {});
}
