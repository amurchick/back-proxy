module.exports = {

  getHostPort(addr, defaultAddr) {

    let [host, port] = addr.split(/:/);
    if (!host || !port) {

      let [defaultHost, defaultPort] = defaultAddr.split(/:/);

      if (!host) {

        if (defaultHost) {

          host = defaultHost;
        }
        else {

          throw new Error(`Can't explode host from '${addr}' and '${defaultAddr}'`);
        }
      }

      if (!port) {

        if (defaultPort) {

          port = defaultPort;
        }
        else {

          throw new Error(`Can't explode port from '${addr}' and '${defaultAddr}'`);
        }
      }
    }

    return [host, port];
  },

};
