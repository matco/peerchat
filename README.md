Webchat
==========
Webchat allows you to chat and send files to anyone using only your browser. It relies on WebRTC, a technology which enable browser to browser communication.

Deployment
----------
Webchat needs a signalisation server to manage users list and to initiate connections. This server is a tiny Node.js script which also serves static HTML files.
Run with ```node server.node.js```.

A sample server can be found [here](http://http://peerchat.herokuapp.com)
