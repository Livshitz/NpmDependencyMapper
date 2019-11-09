import { PackageInfo } from "./PackageInfo";
export interface IPackageResolver {
	fetchPackageInfo(packageName: string, packageVersion?: string): Promise<PackageInfo>;
}
