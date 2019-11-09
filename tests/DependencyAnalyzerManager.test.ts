require('../src/_global');
import Server = require("../src/Server");
import { IPackageResolver } from "../src/entities/IPackageResolver";
import { BasePackageEntity } from "../src/entities/BasePackageEntity";
import { PackageInfo } from "../src/entities/PackageInfo";
import DependencyAnalyzerManager from "../src/DependencyAnalyzerManager";
import LinkedNode from "libx.js/compiled/modules/LinkedNode";
require('libx.js/modules/network');

libx.log.filterLevel = libx.log.severities.fatal; // Comment out this to see full logs in tests

let dam: DependencyAnalyzerManager;

class MockPackageResolver implements IPackageResolver {
	private registry = {
		'a@0': {
			name: 'a',
			version: '0',
			dependencies: {
				b: '0.1',
				c: '0.1',
			}
		},
		'b@0.1': {
			name: 'b',
			version: '0.1',
			dependencies: {
			}
		},
		'c@0.1': {
			name: 'c',
			version: '0.1',
			dependencies: {
			}
		},
	}
	private delayMS: number = 200;

	public async fetchPackageInfo(packageName: string, packageVersion?: string): Promise<PackageInfo> {
		let dep = new BasePackageEntity(packageName, packageVersion);
		let p = libx.newPromise();
		libx.sleep(this.delayMS).then(()=>{
			let res = this.registry[dep.id];
			if (res == null) {
				p.reject(`Package ${packageName}@${packageVersion} was not found!`);
				return;
			}
			p.resolve(new PackageInfo(res));
		})
		return p;
	}
}

beforeAll(async()=>{
	dam = new DependencyAnalyzerManager(new MockPackageResolver());
})

test('basic fetch without children', async () => {
	let map = await dam.getDependenciesMap('b', '0.1');
	expect(map).not.toBe(null);
	expect(map.toStringDeep()).toBe("b@0.1\n");
})

test('basic fetch with children', async () => {
	let map = await dam.getDependenciesMap('a', '0');
	expect(map).not.toBe(null);
	expect(map.toStringDeep()).toBe("a@0\n- b@0.1\n- c@0.1\n");
})

test('multi concurrent', async () => {
	let map1 = await dam.getDependenciesMap('a', '0');
	let map11 = await dam.getDependenciesMap('a', '0');
	let map2 = await dam.getDependenciesMap('b', '0.1');
	let map3 = await dam.getDependenciesMap('c', '0.1');
	expect(map1.toStringDeep()).toBe("a@0\n- b@0.1\n- c@0.1\n");
	expect(map11.toStringDeep()).toBe("a@0\n- b@0.1\n- c@0.1\n");
	expect(map2.toStringDeep()).toBe("b@0.1\n");
	expect(map3.toStringDeep()).toBe("c@0.1\n");
})

test('non existing version', async () => {
	try {
		await dam.getDependenciesMap('a', '0.none');
	} catch(ex) {
		expect(ex).toBe('Package a@0.none was not found!');
	}
})

// More TBD