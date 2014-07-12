#!/usr/bin/env node
var net = require('net');

var proxy;
var tasks = {};
var taskCnt = 1;

var server = net.createServer(function(client) {
	if (!proxy) {
		client.end('No proxy connected');
		return;
	}

	if (taskCnt > 10240)
		taskCnt = 1;

	var taskId = taskCnt++;
	console.log('New http-request #', taskId);
	tasks[taskId] = client;

	client.on('data', function (data) {
		var buf = new Buffer(2);
		buf.writeUInt16BE(taskId, 0);
		buf = Buffer.concat([buf, data]);
		proxy.write(buf);
	});

	client.on('end', function () {
		console.log('http-request end #', taskId);
		delete tasks[taskId];
	});

	client.on('error', function(error) {
		console.log('http-server #' + taskId + ' Error: ' + error.toString());
		delete tasks[taskId];
	});
});

server.on('error', function(error) {
	console.log('http-server error: ' + error.toString());
});

server.listen(8080, function() {
    console.log('http-server listening on port 8080');
});


var proxyListener = net.createServer(function(client) {
	console.log('New proxy connect');

	proxy = client;

	var buf = new Buffer(0);
	var first;
	proxy.on('data', function (data) {
		buf = Buffer.concat([buf, data]);

		while (buf.length >= 6) {
			var taskId = buf.readInt16BE(0);
			var size = buf.readInt32BE(2);

			// Если пришо сообщение о том, что закрыто соединение
			if (!size) {

				if (tasks[taskId]) {
					console.log('Closing request #' + taskId);
					tasks[taskId].end();
					delete tasks[taskId];
				}
				buf = buf.slice(6);

			} else {

				// Если есть данные для отправки в браузер
				if (6 + size <= buf.length) {
					console.log('Data from proxy for request #' + taskId + ', len=' + size);
					if (tasks[taskId])
						tasks[taskId].write(buf.slice(6, size+6));
					if (!first) {
						console.log(buf.slice(6, size+6).toString());
						first = true;
					}

					buf = buf.slice(6 + size);
				} else {
					console.log('There are some partial data for request #' + taskId + ', len=' + (buf.length - 6) + ', needs=' + size);
					break;
				}
			}
		}
	});

	proxy.on('end', function () {
		Object.keys(tasks).forEach(function (task) {
			tasks[task].end('Proxy disconnected');
		});
		tasks = {};
		proxy = undefined;
	});

	proxy.on('error', function(error) {
		console.log('proxy-listener client error: ' + error.toString());
		Object.keys(tasks).forEach(function (task) {
			tasks[task].end('Proxy disconnected');
		});
		tasks = {};
		proxy = undefined;
	});

});

proxyListener.on('error', function(error) {
	console.log('proxy-listener server error: ' + error.toString());
	Object.keys(tasks).forEach(function (task) {
		tasks[task].end('Proxy disconnected');
	});
	tasks = {};
	proxy = undefined;
});

proxyListener.listen(8888, function() {
	console.log('proxy-listener server listening on port 8888');
});
