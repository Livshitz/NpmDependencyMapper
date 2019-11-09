export class BasePackageEntity {
	name: string;
	version: string;

	get id(): string {
		return `${this.name}@${this.version || 'latest'}`;
	}

	constructor(_name: string, _version: string) {
		this.name = _name;
		this.version = BasePackageEntity.normalizeVersionString(_version);
	}

	public static normalizeVersionString(input: string): string {
		if (input == null)
			return null;
		let ret = input.replace(/(.*\>\s*)|(\s*\<.*)|[\~\=\^\s\*]|(git.*)/g, '');
		ret = ret.replace(/^(\d+)$/, '$1.0.0');
		return ret;
	}

	public toString() {
		return this.id;
	}

}
