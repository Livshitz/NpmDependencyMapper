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
		'a@0.0.1': {
			name: 'a',
			version: '0.0.1',
			dependencies: {
				b: '~0.0.1',
			}
		},
		'a@0.0.2': {
			name: 'a',
			version: '0.0.2',
			dependencies: {
				c: '~0.0.1',
			}
		},
		'b@0.0.1': {
			name: 'b',
			version: '0.0.1',
			dependencies: {
				d: '1',
				c: '> 0.0.1 < 2',
			}
		},
		'c@0.0.1': {
			name: 'c',
			version: '0.0.1',
			dependencies: {
			}
		},
		'd@1.0.0': {
			name: 'd',
			version: '1.0.0',
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

			if (res == null && dep.version == null) {
				let keys = Object.keys(this.registry);
				let pkgs = libx._.filter(this.registry, obj=>{
					return obj.name == dep.name;
				});
				if (pkgs != null && pkgs.length > 0) {
					res = libx._.last(pkgs);
				}
			}

			if (res == null) {
				p.reject(new Error(`Package ${packageName}@${packageVersion} was not found!`));
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
	let map = await dam.getDependenciesMap('b', '0.0.1');
	expect(map).not.toBe(null);
	expect(map.toStringDeep()).toBe("b@0.0.1\n- d@1.0.0\n- c@0.0.1\n");
})

test('basic fetch with children', async () => {
	let map = await dam.getDependenciesMap('a', '0.0.1');
	expect(map).not.toBe(null);
	expect(map.toStringDeep()).toBe("a@0.0.1\n- b@0.0.1\n-- d@1.0.0\n-- c@0.0.1\n");
})

test('multi concurrent', async () => {
	let map1 = await dam.getDependenciesMap('a', '0.0.1');
	let map11 = await dam.getDependenciesMap('a', '0.0.1');
	let map2 = await dam.getDependenciesMap('b', '0.0.1');
	let map3 = await dam.getDependenciesMap('c', '0.0.1');
	expect(map1.toStringDeep()).toBe("a@0.0.1\n- b@0.0.1\n-- d@1.0.0\n-- c@0.0.1\n");
	expect(map11.toStringDeep()).toBe("a@0.0.1\n- b@0.0.1\n-- d@1.0.0\n-- c@0.0.1\n");
	expect(map2.toStringDeep()).toBe("b@0.0.1\n- d@1.0.0\n- c@0.0.1\n");
	expect(map3.toStringDeep()).toBe("c@0.0.1\n");
})

test('non existing version', async () => {
	try {
		await dam.getDependenciesMap('a', '0.none');
	} catch(ex) {
		expect(ex.message).toBe('DependencyAnalyzer:getPackageInfo: Error getting package "a@0.none", ex: Package a@0.none was not found!');
	}
})

test('resolve with "latest" tag', async () => {
	let map = await dam.getDependenciesMap('a', null);
	expect(map).not.toBe(null);
	expect(map.toStringDeep()).toBe("a@0.0.2\n- c@0.0.1\n");
})

// More TBD