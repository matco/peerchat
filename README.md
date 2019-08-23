# Peerchat
Peerchat is a peer to peer chat application that runs in a browser. It relies on WebRTC, a technology for browser to browser communication.

A sample server can be found [here](http://peerchat.projects.matco.name).

## Deployment
Peerchat needs a signalization server to manage users and to initiate connections. This server is a tiny Node.js script which also serves the static HTML files required by the application. Launch this server with ```npm start```.

### Heroku
You can deploy the application on [Heroku](https://www.heroku.com) for free.

### Google App Engine
You can deploy the application on [Google App Engine Flex](https://cloud.google.com/appengine) (websockets are not supported on standard environment). Just run ```gcloud app deploy```.
