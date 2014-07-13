#!/usr/bin/env node
var net = require('net');
var conf = require('./config.js');

var proxy;
var tasks = {};

var createConnection = function (buf, taskId) {

	var httpConn = tasks[taskId] = net.connect(conf.shared.port, conf.shared.host, function () {
		console.log('Connected to target #%d %s:%s', taskId, conf.shared.host, conf.shared.port);
		httpConn.write(buf);
	});

	httpConn.on('error', function(error) {
		console.log('Proxy-to-site connection #' + taskId + ' Error: ' + error.toString());
		//httpConn.end();
		if (tasks[taskId]) {
			var buf = new Buffer(6);
			buf.writeUInt16BE(taskId, 0);
			buf.writeUInt32BE(0, 2);
			proxy.write(buf);
			delete tasks[taskId];
		}
	});

	httpConn.on('close', function() {
		console.log('Connection closed target #' + taskId);
		//httpConn.end(buf);
		if (tasks[taskId]) {
			var buf = new Buffer(6);
			buf.writeUInt16BE(taskId, 0);
			buf.writeUInt32BE(0, 2);
			proxy.write(buf);
			delete tasks[taskId];
		}
	});

	httpConn.on('data', function (data) {
		console.log('Send data back for target #' + taskId + ', len=' + data.length);
		var buf = new Buffer(6);
		buf.writeUInt16BE(taskId, 0);
		buf.writeUInt32BE(data.length, 2);
		buf = Buffer.concat([buf, data]);
		proxy.write(buf);
	});
};

function connect() {
	if (proxy)
		proxy.destroy();

	proxy = net.connect(conf.upstream.port, conf.upstream.host, function () {
		console.log('Proxy connected to %s:%s', conf.upstream.host, conf.upstream.port);
	});

	proxy.on('error', function(error) {
		console.log("proxy upstream Connection Error: " + error.toString());
//		if (error.errno === 'ECONNRESET')
//			setTimeout(connect, 1000);
	});

	proxy.on('close', function() {
		console.log('proxy upstream Connection Closed');
		Object.keys(tasks).forEach(function (task) {
			tasks[task].end();
		});
		setTimeout(connect, 1000);
	});

	var buf = new Buffer(0);
	proxy.on('data', function(data) {

		buf = Buffer.concat([buf, data]);

		while (buf.length >= 6) {
			var taskId = buf.readInt16BE(0);
			var size = buf.readInt32BE(2);

			// Upstream informs - user close connection
			if (!size) {

				if (tasks[taskId]) {
					console.log('Closing connection for request #%d', taskId);
					tasks[taskId].end();
					delete tasks[taskId];
				}
				buf = buf.slice(6);

			} else {

				// Check completed frames in buffer
				if (6 + size <= buf.length) {
					console.log('New data from upsteam #%d, len=%d', taskId, size);

					// If no such TaskId connection - create it!
					if (!tasks[taskId]) {

						// Make separate data since first send in callback - data buf may change
						var bufLocal = buf.slice(6, size+6);

						createConnection(bufLocal, taskId);

					} else {
						console.log('Send data to target #' + taskId);
						tasks[taskId].write(buf.slice(6, size+6));
					}

					buf = buf.slice(6 + size);

				} else {
					//console.log('There are some partial data for request #' + taskId + ', len=' + (buf.length - 6) + ', needs=' + size);
					break;
				}
			}
		}

	});
}

connect();