import * as fs from 'fs';
import * as path from 'path';

export function getNetworkPath(basePath: string | null, network: string, name: string, extension: string | null='json'): string {
	if (!basePath) {
		throw new Error(`Cannot read file when missing base path`);
	}

	return path.join(basePath, 'networks', `${network}${name}${extension ? `.${extension}` : ''}`);
}

export async function readFile<T>(file: string, def: T, fn: (data: string) => T): Promise<T> {
	return new Promise((resolve, reject) => {
		fs.access(file, fs.constants.F_OK, (err) => {
		  if (err) {
		    resolve(def);
		  } else {
		    fs.readFile(file, 'utf8', (err, data) => {
		      return err ? reject(err) : resolve(fn(data));
		    });
		  }
		});
	});
}

export async function writeFile<T>(file: string, data: string): Promise<void> {
	return new Promise((resolve, reject) => {
    fs.writeFile(file, data, (err) => {
      return err ? reject(err) : resolve();
    });
  });
}
