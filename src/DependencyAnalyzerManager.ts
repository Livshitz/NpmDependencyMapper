import LinkedNode from "libx.js/compiled/modules/LinkedNode.js"; // Linked-list implementation in TS
import { BasePackageEntity } from "./entities/BasePackageEntity";
import { PackageInfo } from "./entities/PackageInfo";
import { NpmPackageResolver } from "./entities/NpmPackageResolver";
import { IPackageResolver } from "./entities/IPackageResolver";

export default class DependencyAnalyzerManager {
	private cache: LibxJS.Map<PackageInfo> = {};
	private rootToDeps: LibxJS.Map<LibxJS.Map<boolean>> = {};
	private rootsPromises: LibxJS.Map<LibxJS.IDeferred<PackageInfo>> = {};
	private onHitEndOfRoad = new libx.Callbacks();
	private packageResolver: IPackageResolver;

	constructor(_packageResolver?: IPackageResolver) {
		this.onHitEndOfRoad.subscribe(this.checkCompletion.bind(this));
		this.packageResolver = _packageResolver || new NpmPackageResolver();
	}

	public async getDependenciesMap(packageName: string, version: string): Promise<LinkedNode<PackageInfo>> {
		let root = await this.localizeAllDependencies(packageName, version);
		let ret = this.buildDepTreeRcrs(root);
		return ret;
	}

	/// Returns cached package or enqueues for fetching by async worker
	public async getPackageInfo(basicInfo: BasePackageEntity) : Promise<PackageInfo> {
		let existingPackage = this.cache[basicInfo.id];
		if (existingPackage != null) return existingPackage;

		libx.log.v(`DependencyAnalyzer:getPackageInfo: Fetching ${basicInfo.id}`)
		let p = libx.newPromise();
		
		let fetchPromise = this.packageResolver.fetchPackageInfo(basicInfo.name, basicInfo.version);
		fetchPromise.then(depInfo=>{
			libx.log.i(`DependencyAnalyzer:getPackageInfo: Fetched successfully ${basicInfo.id}`)
			if (depInfo == null) p.reject('Got empty package!')
			this.cache[depInfo.id] = depInfo;
			p.resolve(depInfo);
		}, ex=>{
			p.reject(new Error(`DependencyAnalyzer:getPackageInfo: Error getting package "${basicInfo.id}", ex: ${ex.message || ex.statusCode}`));
		});

		return p;
	}

	public async FetchAllDeps(parentPackage: PackageInfo, rootPackage?: PackageInfo) : Promise<PackageInfo> {
		let depPromise = libx.newPromise();
		let depPromises = [];

		if (rootPackage == null) rootPackage = parentPackage;

		let depKeys = Object.keys(parentPackage.dependencies || {});
		
		for(let key of depKeys) {
			let dep = new BasePackageEntity(key, parentPackage.dependencies[key]);
			this.trackDependency(rootPackage, dep);
			let p = this.getPackageInfo(dep);
			
			// Once resolved, do the same thing for the resulted package for deep resolve
			p.then(depInfo=>{
				this.cache[dep.id] = depInfo;
				this.resolveDependency(rootPackage, dep);
				this.FetchAllDeps(depInfo, rootPackage);
			}, ex=>{
				// Empty catch to avoid `Unhandled Promise Rejection`, treated anyway in caller
			});
			
			depPromises.push(p);
		}

		Promise.all(depPromises).then(()=>{
			depPromise.resolve(parentPackage)
		}, ex=> {
			depPromise.reject(ex);
		});

		if (depKeys.length == 0) {
			this.onHitEndOfRoad.trigger(rootPackage);
		}

		return depPromise;
	}

	/// When we reach a branch end, it's time to check if all branches already resolved, if so, call the master promise
	private checkCompletion(rootPackage: PackageInfo) {
		if (Object.keys(this.rootToDeps[rootPackage.id]).length > 0) return;

		if (this.rootsPromises[rootPackage.id] == null) return;
		this.rootsPromises[rootPackage.id].resolve(rootPackage);
		delete this.rootsPromises[rootPackage.id];
	}

	private trackDependency(rootPackage: PackageInfo, dependencyInfo: BasePackageEntity) {
		this.rootToDeps[rootPackage.id][dependencyInfo.id] = true;
	}

	private resolveDependency(rootPackage: PackageInfo, dependencyInfo: BasePackageEntity) {
		delete this.rootToDeps[rootPackage.id][dependencyInfo.id];
	}

	private async localizeAllDependencies(packageName: string, version: string): Promise<PackageInfo> {
		let rootPackage = new BasePackageEntity(packageName, version);
		if (this.rootToDeps[rootPackage.id] == null) this.rootToDeps[rootPackage.id] = {};

		let root = await this.getPackageInfo(rootPackage);

		this.rootsPromises[root.id] = libx.newPromise();
		let depPromise = this.FetchAllDeps(root);

		depPromise.catch(ex=>{
			this.rootsPromises[root.id].reject(ex);
		})

		return this.rootsPromises[root.id] || depPromise;
	}

	private buildDepTreeRcrs(parentPackage: PackageInfo, currentPointer?: LinkedNode<PackageInfo>): LinkedNode<PackageInfo> {
		if (currentPointer == null) currentPointer = new LinkedNode<PackageInfo>(parentPackage);
		
		for(let depName of Object.keys(parentPackage.dependencies || {})) {
			let depInfo = new BasePackageEntity(depName, parentPackage.dependencies[depName])
			let dep = this.cache[depInfo.id]; // We are assuming all relevant dependencies already resolved into cache
			let child = currentPointer.addChild(dep);
			this.buildDepTreeRcrs(dep, child);
		}

		return currentPointer;
	}
}


