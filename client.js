#!/usr/bin/env node
var net = require('net');
var conf = require('./config.js');

var proxy;
var tasks = {};

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
		setTimeout(connect, 1000);
	});

	proxy.on('data', function(data) {
		var taskId = data.readInt16BE(0);
		console.log('New data from upsteam #', taskId);
		data = data.slice(2);

		// If no such TaskId connection - create it!
		if (!tasks[taskId]) {
			var httpConn = tasks[taskId] = net.connect(conf.shared.port, conf.shared.host, function () {
				console.log('Connected to target #d %s:%s', taskId, conf.shared.host, conf.shared.port);
				httpConn.write(data);
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
		} else {
			console.log('Send data to target #' + taskId);
			tasks[taskId].write(data);
		}
	});
}

connect();