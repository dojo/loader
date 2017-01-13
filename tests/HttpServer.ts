import * as fs from 'intern/dojo/node!fs';
import * as http from 'intern/dojo/node!http';
import * as path from 'intern/dojo/node!path';
import { Socket } from 'net';

export default class HttpServer {
	contentTypes: any = {
		'': 'application/octet-stream',
		'.css': 'text/css',
		'.gif': 'image/gif',
		'.html': 'text/html',
		'.jpg': 'image/jpeg',
		'.js': 'text/javascript',
		'.json': 'application/json',
		'.png': 'image/png'
	};

	config: any;
	server?: http.Server;

	constructor(config?: any) {
		this.config = config || {};

		if (!this.config.basePath) {
			this.config.basePath = path.join(process.cwd(), '_build');
		}
	}

	protected _handleRequest(request: http.ServerRequest, response: http.ServerResponse) {
		if (request.method === 'GET') {
			let file: string = /^\/+([^?]*)/.exec(request.url!)![ 1 ];
			let wholePath: string = path.join(this.config.basePath, file);

			fs.stat(wholePath, (error: Error, stats: fs.Stats) => {
				if (error) {
					this._send404(response);
					return;
				}

				let contentType: string = this.contentTypes[ path.extname(wholePath) ] || this.contentTypes[ '' ];

				response.writeHead(200, {
					... {
						'Content-Type': contentType,
						'Content-Length': stats.size
					}, ... this.config.headers
				});

				fs.createReadStream(wholePath).pipe(response);
			});
		}
		else {
			response.statusCode = 501;
			response.end();
		}
	}

	protected _send404(response: http.ServerResponse) {
		response.writeHead(404, {
			'Content-Type': 'text/html;charset=utf-8'
		});
		response.end('<!DOCTYPE html><title>404 Not Found</title><h1>404 Not Found</h1><!-- ' +
			new Array(512).join('.') + ' -->');
	}

	setHeader(name: string, value: string): void {
		if (!this.config.headers) {
			this.config.headers = {};
		}

		this.config.headers[ name ] = value;
	}

	start(port: number = 9020, callback: () => void) {
		this.server = http.createServer(this._handleRequest.bind(this));
		let sockets: Socket[] = [];

		// If sockets are not manually destroyed then Node.js will keep itself running until they all expire
		this.server.on('close', () => {
			let socket: Socket | undefined;
			while ((socket = sockets.pop())) {
				socket.destroy();
			}
		});

		this.server.on('connection', function (socket: Socket) {
			sockets.push(socket);

			// Disabling Nagle improves server performance on low-latency connections, which are more common
			// during testing than high-latency connections
			socket.setNoDelay(true);

			socket.on('close', function () {
				let index = sockets.indexOf(socket);
				index !== -1 && sockets.splice(index, 1);
			});
		});

		this.server.listen(port, callback);
	}

	stop() {
		if (this.server) {
			this.server.close();
		}

		this.server = undefined;
	}
};
