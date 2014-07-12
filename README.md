back-proxy
==========

Reversing proxy to you gadgets or home http-server behind NAT with dynamic WAN ip.
Needs to "servers": one in Internet for you connects for proxing and second in you home for serve proxy requests.

# How its works
![Basic diagram](https://raw.githubusercontent.com/amurchick/back-proxy/master/BasicDiagram.png)

## Scenario

You want to access to you gadget (like http://tessel.io who have own web server) in home LAN (ip: 192.168.0.201).

### Steps

#### Create config

Please copy `config.default.js` to `config.js` and modify to you needs.

```javascript
module.exports = {

	// Public server config (where you connect to access LAN server)
	public: {
		host:	'1.2.3.4',
		port:	'8080'
	},

	// Upstream server config (where proxy from LAN connect)
	upstream: {
		host:	'1.2.3.4',
		port:	'8888'
	},

	// Shared server config (server in LAN)
	shared: {
		host:	'192.168.0.201',
		port:	'8000'
	}

};
```