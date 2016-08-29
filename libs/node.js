/**
 *
 * The MIT License (MIT)
 *
 * https://github.com/flowchain
 * 
 * Copyright (c) 2016 Jollen
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

'use strict';

var ChordUtils = require('./utils');
require('console.table');

/*
 * Export 'Node' class
 */
if (typeof(module) != "undefined" && typeof(exports) != "undefined")
  module.exports = Node;

// Chord protocols
var Chord = {
    NOTIFY_PREDECESSOR: 0,
    NOTIFY_SUCCESSOR: 1,
    FIND_SUCCESSOR: 2,
    FOUND_SUCCESSOR: 3,
    MESSAGE: 4
};

function Node(id, server) {
    this.id = id;
    this.address = server.host;
    this.port = server.port;

    this.server = server;

    // Each node can keep a finger table containing up to 'm' entries
    // Default is 32 entries
    this.finger_entries = 8;

    this.predecessor = null;

    // Default successor is self
    this._self = this.successor = { 
        address: this.address, 
        port: this.port,
        id: this.id
    };

    // Initialize finger table
    this.fingers = [];
    this.fingers.length = 0;

    this.next_finger = 0;

    console.info('node id = '+ this.id);
    console.info('successor = ' + JSON.stringify(this.successor));

    // Fix fingers
    var next = this.next_finger;
    var fixFingerId = '';

    // Print finger table entries
    if (ChordUtils.DebugFixFingers) {    
        var dataset = [];
    }   

    setInterval(function fix_fingers() {
        var successor = this.successor;
        var fingers = this.fingers;

        if (next >= this.finger_entries) {
            next = 0;
        }
        fixFingerId = ChordUtils.getFixFingerId(this.id, next);

        // n.fix_fingers()
        this.send(successor, { 
            type: Chord.FIND_SUCCESSOR, 
            id: fixFingerId,
            next: next
        });

        next = next + 1;

        if (ChordUtils.DebugFixFingers)
            console.info('getFixFingerId = ' + fixFingerId);

        // Print finger table entries
        if (ChordUtils.DebugFixFingers) {
            dataset = [];

            console.info('finger table length = '+ fingers.length);

            for (var i = fingers.length - 1; i >= 0; --i) {
                if (!fingers[i]) continue;

                dataset.push({
                    start: fingers[i].start,                
                    successor: fingers[i].successor.id
                });
            }
            console.table(dataset);
        }
    }.bind(this), 5000);

    // Stabilize
    setInterval(function stabilize() {
        var successor = this.successor
        this.send(successor, { type: Chord.NOTIFY_PREDECESSOR });
    }.bind(this), 3000);
};

/*
 * @param {Object} { address: '127.0.0.1', port: 8000 }
 * @param {Object} { type: 2, id: 'b283326930a8b2baded20bb1cf5b6358' }
 */
Node.prototype.send = function(from, message, to) {
    if (typeof to === 'undefined') {
        to = from;
        from = this._self;
    }

    if (typeof message.id === 'undefined') {
        message.id = this.id;
    }

    var packet = {
        from: {
            address: from.address,
            port: from.port,
            id: from.id
        },
        message: message
    };

    return this.server.sendChordMessage(to, packet);
};

/*
 * @return {boolean}
 */
Node.prototype.join = function(remote) {
    var message = {
        type: Chord.FIND_SUCCESSOR
    };

    // Initialize node's predecessor
    this.predecessor = null;

    if (ChordUtils.DebugNodeJoin)
        console.info('try to join ' + JSON.stringify(remote));

    // Join
    this.send(remote, message);

    return true;
};

/*
 * Return closet finger proceding ID
 */
Node.prototype.closet_finger_preceding = function(find_id) {
    /*
     * n.closest_preceding_node(id)
     *   for i = m downto 1
     *     if (finger[i]∈(n,id))
     *       return finger[i];
     *   return n;
     */
    for (var i = this.fingers.length - 1; i >= 0; --i) {
        if (this.fingers[i] && ChordUtils.isInRange(this.fingers[i].successor.id, this.id, find_id)) {
            return this.fingers[i].successor;
        }
    }

    if (ChordUtils.isInRange(this.successor.id, this.id, find_id)) {
        return this.successor;
    } else {
        return this._self;
    }
};

Node.prototype.dispatch = function(from, message) {
    switch (message.type) {
        case Chord.NOTIFY_PREDECESSOR:
            if (this.predecessor == null 
                /*
                 * n'∈(predecessor, n)
                 */
                || ChordUtils.isInRange(from.id, this.predecessor.id, this.id)) {
                this.predecessor = from;

                console.info('new predecessor = ' + this.predecessor.id);
            }

            if (ChordUtils.DebugPredecessor) {
                console.info('predecessor = ' + this.predecessor.id);
            }

            this.send(this.predecessor, { type: Chord.NOTIFY_SUCCESSOR }, from);
            break; 

        case Chord.FOUND_SUCCESSOR:
            if (message.hasOwnProperty('next')) {
                this.fingers[message.next] = {
                    successor: from,
                    start: message.id
                };
                console.info('FOUND_SUCCESSOR = finger table fixed');
            } else {
                this.successor = from;
                console.info('new successor = ' + this.successor.id);
            }
            break;

        case Chord.NOTIFY_SUCCESSOR:     
            /*
             * n.stabilize()
             *   x = successor.predecessor;
             *   if (x∈(n, successor))
             *     successor = x;
             *   successor.notify(n);
             */
            if (ChordUtils.isInRange(this.id, from.id, this.successor.id)) {
                this.successor = this._self;
                console.info('new successor = ' + this.successor.id);
            }
            break;  

        case Chord.FIND_SUCCESSOR:
            // Yes, that should be a closing square bracket to match the opening parenthesis.
            // It is a half closed interval.
            if (ChordUtils.isInHalfRange(message.id, this.id, this.successor.id)) {
                message.type = Chord.FOUND_SUCCESSOR;
                //this.send(this.successor, message, from);
                this.send(from, message, this);

                if (ChordUtils.DebugSuccessor)
                    console.info('FIND_SUCCESSOR = message = ' + JSON.stringify(from));

            // forward the query around the circle
            } else {
                var n0 = this.closet_finger_preceding(message.id);
                this.send(from, message, n0);

                if (ChordUtils.DebugSuccessor)
                    console.info('FIND_SUCCESSOR = closet_finger_preceding = ' + n0.id);
            }

            break;

        case Chord.MESSAGE:
            this.send(this.successor, message, from);
            break;
        default:
            console.error('Unknown Chord message: ' + message.type);
            break;
    };
};
