require('./_global');
libx.log.isShowTime = true;

import express = require('express');
const bodyParser = require('body-parser');

// Modules
import DependencyAnalyzerManager from './DependencyAnalyzerManager';

class Server {
	private app: express.Application;
	private server: any;
	private port = 5678;
	
	constructor() {
		this.app = express();
		this.app.use(bodyParser.json());
	}

	public async serve(): Promise<void> {
		let p = libx.newPromise();
		let dam = new DependencyAnalyzerManager();

		this.app.get('/get-dependencies/:packageName/:packageVersion?', async (req, res) => {
			let packageName = req.params.packageName;
			let packageVersion = req.params.packageVersion;
			libx.log.verbose(`request "/get-dependencies/${packageName}/${packageVersion}":`);

			let isJson = req.query.json;

			try {
				let ret = await dam.getDependenciesMap(packageName, packageVersion); //('express', '4.17.1');

				if (isJson) {
					let map = ret.serialize();
					return res.status(200).json(map);
				} else {
					let map = '';
					ret.crawl((node, level)=>{
						map += ('&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(level+1) + ' - ' + node.content.id) + '\n<br/>';
						return false;
					});
					libx.log.v('Done');
					return res.status(200).send(map);
				}

			} catch(ex) {
				libx.log.e(`Server: Error while getting and mapping dependency for ${packageName}@${packageVersion}`, ex.message);
				return res.status(500).send(ex);
			}
		});

		this.server = this.app.listen(this.port, () => {
			libx.log.info('------------------------------');
			libx.log.info(`Local server listening on http://localhost:${this.port}`);
			libx.log.info('------------------------------');
			p.resolve();
		})
	
		return p;
	}

	public stop(): void {
		this.server.close();
	}
}

// Entrypoint:
if (libx.node.isCalledDirectly()) {
	let server = new Server();

	libx.node.onExit(()=> {
		libx.log.i('server:cli: shutting down server...')
		server.stop();
	});
	
	(async () => {
		await server.serve();
		libx.log.i('ready!');
	})();
}

export = Server;
