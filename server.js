#!/usr/bin/env node
let net = require('net');
let utils = require('./utils.js');
let conf = require('./server-config.js');

let proxy;
let tasks = {};
let taskCnt = 1;
let proxies = {};

const createUpstreamListener = (addr) => {

  let server = net.createServer(function (client) {

    if (!proxy) {

      client.end('No proxy connected');
      return;
    }

    if (taskCnt > 10240) {

      taskCnt = 1;
    }

    let taskId = taskCnt++;
    console.log('New user-request #', taskId);
    tasks[taskId] = client;

    client.on('data', function (data) {

      if (!proxy) {

        client.end('No proxy connected');
        return;
      }

      let buf = Buffer.alloc(6);
      buf.writeUInt16BE(taskId, 0);
      buf.writeUInt32BE(data.length, 2);
      buf = Buffer.concat([buf, data]);
      proxy.write(buf);
    });

    client.on('end', function () {

      console.log('user-request end #', taskId);

      if (proxy && tasks[taskId]) {

        let buf = Buffer.alloc(6);
        buf.writeUInt16BE(taskId, 0);
        buf.writeUInt32BE(0, 2);
        proxy.write(buf);
        delete tasks[taskId];
      }
    });

    client.on('error', function (error) {

      console.log('user-request #' + taskId + ' Error: ' + error.toString());
      delete tasks[taskId];
    });
  });

  server.on('error', function (error) {

    console.log('user-request error: ' + error.toString());
  });

  server.listen(...utils.getHostPort(addr), function () {

    console.log('user-request listening on %s:%s', conf.public.host, conf.public.port);
  });

  return server;
};

let proxyListener = net.createServer(function (client) {

  proxy = client;

  let buf = Buffer.alloc(0);
  proxy.on('data', function (data) {

    buf = Buffer.concat([buf, data]);

    while (buf.length >= 6) {

      let taskId = buf.readInt16BE(0);
      let size = buf.readInt32BE(2);

      // Proxy informs - shared server close connection
      if (!size) {

        if (tasks[taskId]) {
          console.log('Closing request #' + taskId);
          tasks[taskId].end();
          delete tasks[taskId];
        }
        buf = buf.slice(6);

      }
      else {

        // Check completed frames in buffer
        if (6 + size <= buf.length) {

          // console.log('Data from proxy for request #' + taskId + ', len=' + size);
          if (tasks[taskId]) {

            tasks[taskId].write(buf.slice(6, size + 6));
          }

          buf = buf.slice(6 + size);
        }
        else {

          // console.log('There are some partial data for request #' + taskId + ', len=' + (buf.length - 6) + ', needs=' + size);
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

  proxy.on('error', function (error) {

    console.log('proxy-listener client error: ' + error.toString());
    Object.keys(tasks).forEach(function (task) {

      tasks[task].end('Proxy disconnected');
    });

    tasks = {};
    proxy = undefined;
  });

  console.log('Proxy connected');

});

proxyListener.on('error', function (error) {

  console.log('proxy-listener server error: ' + error.toString());
  Object.keys(tasks).forEach(function (task) {

    tasks[task].end('Proxy disconnected');
  });
  tasks = {};
  proxy = undefined;
});

proxyListener.listen(conf.upstream.port, conf.upstream.host, function () {

  console.log('proxy-listener server listening on %s:%s', conf.upstream.host, conf.upstream.port);
});

let server = createUpstreamListener(conf.upstream);
for (let map of conf.maps) {

  map.server = utils.getHostPort(map.server, conf.upstream);
  map.client = utils.getHostPort(map.client);
}
