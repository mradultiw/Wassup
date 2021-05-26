# Wassup!


**Wassup** is a client-server based desktop chat application written in Javascript and related frameworks. It has a central server and database which is used to connect clients together. Each client has it's own local database. Technologies used are:

[Node.js](https://nodejs.org/en/about/)
: Used to write central server with *express.js* which is a node framework

[Socket.io](https://socket.io/)
: Wassup uses socketio, an implementation of WebSocket protocol for full duplex communication.

[MongoDB](https://www.mongodb.com/)
: Used to create central database with native drivers for node.js

[PouchDB](https://pouchdb.com/)
: Used on client's local DB. Other options were also available to choose from, but used PouchDB  as it's very small size thus reducing overall size of the app. 

[Electron.js](https://www.electronjs.org/)
: Used to create client-side desktop application.

[HTML/CSS](https://developer.mozilla.org/en-US/docs/Web/HTML)
: Used to structure client side pages which are rendered by electron.js

[Bootstrap](https://getbootstrap.com/)
: Used for styling with some readymade tools. 

[jQuery](https://jquery.com/)
: Used for accessing DOM elements with it's rich features and methods.

---

<mark>⚠ Watchout! construction work ahead</mark>

#### NOTE: 
>This is an educational project developed with intention of learning different technologies  mentioned above and might not work efficiently if used at scale. If you are a student or equivalent, don't feel shy to fork and use; you can also mention credit if using as it is **:)** 
>You can also **star**⭐ the repo if you liked it **:D**

### Features
A wide list of features have already been implemented which also makes an underlying structures to quickly implement other features. Some features currently supported are:

- [x] Sign-in/ Sign-up/ log-out
- [x]  Add/Remove Contact with list view
- [x]  Direct Message
- [x]  Block/Unblock user with list view
- [x] View Profile/ full-size picture
- [x] Update profile picture/name/about
- [x] Private chat with user
- [x] Supports *text/emoji/images/GIFs* in chats
- [x] Images can be viewed in-chat or full-size
- [ ] Group Support
- [ ] Voice calling
* Pending features will be possibly implemented in upcoming time. However, if anyone wants to contribute, feel free to give a pull request **:)** 

### Description
Either private chat or group, *wassup* uses websockets to push messages to other sockets(for personal) or rooms(for groups). Client will invoke some event and server will act accordingly. Not that on client side, only one instance of running application is restricted to avoid local-db conflicts; reason being the Main process of electron.js holds state of user currently logged in. However, multiple users can use their respective accounts on same device, but only one can be logged in at a time.

> do a window refresh (Ctrl + R) if you feel any lag once a while.

Attached are some screenshots from the app:

