module.exports = {

  // Public server config (where you connect to access LAN server)
  public: {
    host: '1.2.3.4',
    port: '8080'
  },

  // Upstream server config (where proxy from LAN connect)
  upstream: {
    host: '1.2.3.4',
    port: '8888'
  },

  // Shared server config (server in LAN)
  shared: {
    host: '192.168.0.201',
    port: '8000',
  }

};
