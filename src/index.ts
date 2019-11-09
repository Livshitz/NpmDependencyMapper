require('./_global');
import fs = require('fs');

// Modules
import DependencyAnalyzerManager from "./DependencyAnalyzerManager";

// Entrypoint:
(async ()=>{
	let dam = new DependencyAnalyzerManager();

	// Support calling as a NodeJS script:
	if (libx.node.isCalledDirectly()) {
		libx.log.info('---------------------------');
		
		try {
			if (libx.node.args.length == 0) throw "No arguments provided!"
			let pkgName = libx.node.args.name;
			let pkgVer = libx.node.args.ver;
			if (pkgName == null) throw "Missing argument! (--name <pkgName> --ver <pkgVer?>)"

			let tree = await dam.getDependenciesMap(pkgName, pkgVer); // '1.2.0'); //('express', '4.17.1');

			let fullMap = tree.toStringDeep();
			libx.node.mkdirRecursiveSync('.tmp');
			fs.writeFileSync('.tmp/full-map.txt', fullMap);
			libx.log.info('Successfully wrote dependency map (full): ', '.tmp/full-map.txt');

			let map = ''
			tree.crawl((node, level)=>{
				map += ('\t'.repeat(level) + ' - ' + node.content.id) + '\n';
				return false;
			});
			fs.writeFileSync('.tmp/mini-map.txt', map);
			console.log('Minimap: \n' + map);
			libx.log.info('Successfully wrote dependency map (mini): ', '.tmp/mini-map.txt');

			libx.log.info(libx.log.color('- Main DONE! -', libx.log.colors.fgGreen));
		} catch(ex) {
			libx.log.error(libx.log.color('Error: ', libx.log.colors.fgRed), ex);
		}
		libx.log.info('---------------------------');
	}
})();

