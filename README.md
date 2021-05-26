# Wassup!


**Wassup** is a client-server based desktop chat application written in Javascript and related frameworks. It has a central server and database which is used to connect clients together. Each client has it's own local database. Technologies used are:

**[Node.js](https://nodejs.org/en/about/)**
: Used to write central server with *express.js* which is a node framework

**[Electron.js](https://www.electronjs.org/)**
: Used to create client-side desktop application.

**[Socket.io](https://socket.io/)**
: Wassup uses socketio, an implementation of WebSocket protocol for full duplex communication.

**[MongoDB](https://www.mongodb.com/)**
: Used to create central database with native drivers for node.js

**[PouchDB](https://pouchdb.com/)**
: Used on client's local DB. Other options were also available to choose from, but used PouchDB  as it's very small size thus reducing overall size of the app. 

**[HTML/CSS](https://developer.mozilla.org/en-US/docs/Web/HTML)**
: Used to structure client side pages which are rendered by electron.js

**[Bootstrap](https://getbootstrap.com/)**
: Used for styling with some readymade tools. 

**[jQuery](https://jquery.com/)**
: Used for accessing DOM elements with it's rich features and methods.

---

#### NOTE: 
>This is an educational project developed with intention of learning different technologies  mentioned above and might not work efficiently if used at scale. If you are a student or equivalent, don't feel shy to fork and use **:)** 
>
>You can also **star**⭐ the repo if you liked it <em>**:D**</em>

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

> do a window refresh (Ctrl + R) if you feel any lag, maybe once a while.

Attached are some screenshots from the app:

<u>**1. SignIn/SignUp:**</u>
![loginPage](https://github.com/mradultiw/Wassup/blob/main/ss/login.PNG)

<u>**2. Update Your Profile:**</u>
Clicking on your name in top-right, you can see as well as edit your profile.
![Profile Update](https://github.com/mradultiw/Wassup/blob/main/ss/profile%20update.PNG)


<u>**3. Find People/ See Contacts:**</u>
	Search people by the email they have registered. Below, you can also see your saved contacts. You can see their profile by clicking on their card.
	![find people](https://github.com/mradultiw/Wassup/blob/main/ss/findcontact.PNG)

<u>**4. Profile Find Result:**</u>
	If profile exists, you'll see similar card where you can choose to add contact or talk directly without adding.
![profile find result](https://github.com/mradultiw/Wassup/blob/main/ss/profile%20finding.PNG)

<u>**5. Viewing profile while chating:**</u>
	To view someone's profile later you need to click on their image icon. Full screen image can also be viewed on clicking picture again.
	![viewing profile](https://github.com/mradultiw/Wassup/blob/main/ss/viewing%20profile.PNG)
	
<u>**6.  Can Send Images/GIF:**</u>
	You can send text/images/gif which can also be viewed on full size screen on clicking over it
	![GIF](https://github.com/mradultiw/Wassup/blob/main/ss/gif.PNG)

<u>**7. options.:**</u>
	A list of options that can select. More options maybe added in future commits, if possible.
	![Options](https://github.com/mradultiw/Wassup/blob/main/ss/options.PNG)
