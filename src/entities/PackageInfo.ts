import { BasePackageEntity } from "./BasePackageEntity";
export class PackageInfo extends BasePackageEntity {
	description: string;
	dependencies: LibxJS.Map<string>;
	devDependencies: LibxJS.Map<string>;

	constructor(jsonObject: any) {
		super(jsonObject.name, jsonObject.version);
		this.description = jsonObject.description;
		this.dependencies = jsonObject.dependencies;
		this.devDependencies = jsonObject.devDependencies;
	}

	public toString() {
		return super.toString();
	}
}
