import { BasePackageEntity } from "./BasePackageEntity";
import { PackageInfo } from "./PackageInfo";
import { IPackageResolver } from "./IPackageResolver";

export class NpmPackageResolver implements IPackageResolver {
	public async fetchPackageInfo(packageName: string, packageVersion?: string): Promise<PackageInfo> {
		let version = BasePackageEntity.normalizeVersionString(packageVersion);
		let endpoint = `https://registry.npmjs.org/${packageName}/${version}`;
		let res = await libx.di.modules.network.httpGetJson(endpoint);
		return new PackageInfo(res); // Fill missing properties/functions on top of the returned json object
	}
}
