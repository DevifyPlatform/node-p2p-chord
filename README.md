# node-p2p-chord

[![](https://travis-ci.org/jollen/node-p2p-chord.svg?branch=master)](https://travis-ci.org/jollen/node-p2p-chord)

*node-p2p-chord* is a light weight Chord protocol and algorithm library in JavaScript for a peer-to-peer distributed hash table (DHT). It is a sub-project of [WoT.City](https://wotcity.com) and the underlying component of [WoT.City](https://wotcity.com) software framework. The technical details can be found at [WoT.City white paper](https://wotcity.com/WoTCity-WhitePaper.pdf).

## Usage

To start a virtual node.

```
$ export HOST=192.168.0.3	; the IP address for this Chord node to listening to
$ export PORT=8000			; the port number for this Chord node to listening to
$ node node0.js				; start the the virtual node
```

To connect a subsequent node in order to join the existing p2p network.

```
$ export HOST=192.168.0.100	; the IP address for this Chord node to listening to
$ export PORT=9000			; the port number for this Chord node to listening to
$ node node1.js				; start a Chord node and join the existing node
```

In the ```node1.js``` file that you have to add ```join``` property for the connecting node.

```
// to connect to a subsequent node
server.start({
	onmessage: onmessage,
	join: { 
		address: '192.168.0.3', 
		port: 8000
	}	
});
```

## Quickstart

To create a node and connect to a subsequent node. Add the ```join``` property to specify the existing p2p node.

```
var server = require('./libs/server');

/**
 * Chord network.
 */
var onmessage = function(payload) {
};

/**
 * Join an existing node.
 */
server.start({
	onmessage: onmessage,
	join: { 
		address: '127.0.0.1', 
		port: 8001
	}	
});
```

To create a new virtual node.

```
var server = require('./libs/server');

/**
 * Chord network.
 */
var onmessage = function(payload) {
};

/**
 * Create a virtual node (seed node).
 */
server.start({
	onmessage: onmessage,
});
```

## History

v0.5: current
 * Support full stabilization
 * Major bug fixed: [#0ee56e413a8c8bab68da282a445f5705fc34305b], [#c7db7fdfc731c6f103f955b763c1f80862ff66c8]

v0.4: 2016.12.19
 * Major bug fixed
  * FOUND_SUCCESSOR bugs
  * NOTIFY_SUCCESSOR bugs
 * Improve startUpdateFingers()
 * Add a new ```NOTIFY_JOIN``` RPC message

v0.3: 2016.08.27
 * Support refreshing finger table entries
 * Support verifying successor's consistency

v0.2: 2016.08.26
 * Support create and join
 * Support stabilize and notify

v0.1: 2016.08.25
 * Chord node prototype
 * Chord node over WebSocket server

## Credits

There are existing Chord node.js implementations, and the *node-p2p-chord* is inspired by them.

* [shigasumi/chord-node-js](https://github.com/shigasumi/chord-node-js)
* [optimizely/chord](https://github.com/optimizely/chord)
* [tsujio/webrtc-chord](https://github.com/tsujio/webrtc-chord)

## License

The MIT License (MIT)
