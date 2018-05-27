#!/usr/bin/env node
let net = require('net');
let conf = require('./config.js');

let proxy;
let tasks = {};

let createConnection = function (buf, taskId) {

  let tcpConn = tasks[taskId] = net.connect(conf.shared.port, conf.shared.host, function () {

    console.log('Connected to target #%d %s:%s', taskId, conf.shared.host, conf.shared.port);
    tcpConn.write(buf);
  });

  tcpConn.on('error', function (error) {

    console.log('Proxy-to-site connection #' + taskId + ' Error: ' + error.toString());

    // tcpConn.end();
    if (tasks[taskId]) {

      let buf = Buffer.alloc(6);
      buf.writeUInt16BE(taskId, 0);
      buf.writeUInt32BE(0, 2);
      proxy.write(buf);
      delete tasks[taskId];
    }
  });

  tcpConn.on('close', function () {

    console.log('Connection closed target #' + taskId);

    // tcpConn.end(buf);
    if (tasks[taskId]) {

      let buf = Buffer.alloc(6);
      buf.writeUInt16BE(taskId, 0);
      buf.writeUInt32BE(0, 2);
      proxy.write(buf);
      delete tasks[taskId];
    }
  });

  tcpConn.on('data', function (data) {

    console.log('Send data back for target #' + taskId + ', len=' + data.length);
    let buf = Buffer.alloc(6);
    buf.writeUInt16BE(taskId, 0);
    buf.writeUInt32BE(data.length, 2);
    buf = Buffer.concat([buf, data]);
    proxy.write(buf);
  });
};

function connect() {

  if (proxy) {

    proxy.destroy();
  }

  proxy = net.connect(conf.upstream.port, conf.upstream.host, function () {

    console.log('Proxy connected to %s:%s', conf.upstream.host, conf.upstream.port);
  });

  proxy.on('error', function (error) {

    console.log('proxy upstream Connection Error: ' + error.toString());
    // if (error.errno === 'ECONNRESET')
    //   setTimeout(connect, 1000);
  });

  proxy.on('close', function () {

    console.log('proxy upstream Connection Closed');
    Object.keys(tasks).forEach(function (task) {

      tasks[task].end();
    });

    setTimeout(connect, 1000);
  });

  let buf = Buffer.alloc(0);
  proxy.on('data', function (data) {

    buf = Buffer.concat([buf, data]);

    while (buf.length >= 6) {

      let taskId = buf.readInt16BE(0);
      let size = buf.readInt32BE(2);

      // Upstream informs - user close connection
      if (!size) {

        if (tasks[taskId]) {

          console.log('Closing connection for request #%d', taskId);
          tasks[taskId].end();
          delete tasks[taskId];
        }

        buf = buf.slice(6);

      }
      else {

        // Check completed frames in buffer
        if (6 + size <= buf.length) {

          console.log('New data from upsteam #%d, len=%d', taskId, size);

          // If no such TaskId connection - create it!
          if (!tasks[taskId]) {

            // Make separate data since first send in callback - data buf may change
            let bufLocal = buf.slice(6, size + 6);

            createConnection(bufLocal, taskId);

          }
          else {

            console.log('Send data to target #' + taskId);
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
}

connect();
