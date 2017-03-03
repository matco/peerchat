# Peerchat
Peerchat allows you to chat and send files to anyone using only your browser. It relies on WebRTC, a technology that allows browser to browser communication.

## Deployment
Peerchat needs a signalization server to manage users and to initiate connections. This server is a tiny Node.js script which also serves static HTML files.
Run with ```npm start```.

A sample server can be found [here](http://peerchat.herokuapp.com).
