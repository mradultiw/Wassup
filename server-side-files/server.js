require("dotenv").config();
const express = require("express");
const path = require("path");
const http = require("http");
const md5 = require("md5");
const socketio = require("socket.io");
const app = express();
const server = http.createServer(app);
const { MongoClient, ObjectID, ObjectId } = require("mongodb");
const querystring = require("querystring");
const e = require("express");
const { send } = require("process");
const port = process.env.PORT || 3000;
const uri = "mongodb://localhost:27017";
const dbClient = new MongoClient(uri, { useUnifiedTopology: true });

const CreateUser = function (email, password) {
  (this.email = email),
    (this.password = password),
    (this.name = null),
    (this.picture = null),
    (this.picture_hash = null),
    (this.about = null),
    (this.groupList = []),
    (this.messageQueue = []);
};

const io = socketio(server, {
  serveClient: false,
  cors: {
    origin: "http://localhost:3000/",
    methods: ["GET", "POST"],
  },
});

server.listen(port, () => {
  console.log(`Server is on: http://localhost:${port}/`);
});

/***************************** db operations **********************************/

const dbConnect = async () => {
  try {
    await dbClient.connect();
    console.log("client connected to db successfully");
  } finally {
    // await database.close();
  }
};

const userQueryDB = async (collectionName, data) => {
  if (!dbClient.isConnected()) {
    await dbConnect().catch(console.dir);
  }
  return await dbClient
    .db("wassup")
    .collection(collectionName)
    .findOne({ email: data.email });
};

const insertDB = async (collectionName, document) => {
  if (!dbClient.isConnected()) {
    await dbConnect().catch(console.dir);
  }
  return dbClient.db("wassup").collection(collectionName).insertOne(document);
};

const addToMessageQueue = async (collectionName, packet) => {
  if (!dbClient.isConnected()) {
    await dbConnect().catch(console.dir);
  }
  let receiverId = packet.to,
    senderId = packet.from;
  delete packet.to;
  delete packet.from;

  (async () => {
    return dbClient
      .db("wassup")
      .collection(collectionName)
      .findOne(
        {
          _id: ObjectId(receiverId),
          "messageQueue._id": ObjectId(senderId),
        },
        { projection: { _id: 1 } }
      );
  })() // check sender exist in message queue
    .then((senderExist) => {
      if (!senderExist) {
        // if sender not exist, create entry in message queue
        (async () => {
          return dbClient
            .db("wassup")
            .collection("users")
            .findOne(
              { _id: ObjectId(senderId) },
              {
                projection: {
                  name: 1,
                  email: 1,
                  about: 1,
                  picture_hash: 1,
                  picture: 1,
                },
              }
            );
        })() // finding profile of sender
          .then((person) => {
            dbClient
              .db("wassup")
              .collection(collectionName)
              .updateOne(
                { _id: ObjectId(receiverId) },
                {
                  $push: {
                    messageQueue: { ...person, chat: [packet] },
                  },
                }
              );
          })
          .catch((err) => console.log("error fetching sender profile: ", err));
      } else {
        // else append in previous pending chats of sender
        dbClient
          .db("wassup")
          .collection(collectionName)
          .updateOne(
            {
              _id: ObjectId(receiverId),
              "messageQueue._id": ObjectId(senderId),
            },
            {
              $push: { "messageQueue.$.chat": packet },
            }
          );
        // console.log("else inserted chat in msgq");
      }
    })
    .catch((err) => console.log("error checking existence: ", err));
};

dbConnect().catch(console.dir);

/***************************** socket operations *******************************/

const online_user_socket = new Map();
const online_socket_user = new Map();

io.on("connection", (socket) => {
  console.log("socket connected: ", socket.id);
  socket.on("mark-user-online", (user_id) => {
    if (user_id === undefined) throw "user undefined in mark-user-online";
    online_user_socket.set(user_id, socket.id);
    online_socket_user.set(socket.id, user_id);
    console.log(online_user_socket);
    (async () => {
      return dbClient
        .db("wassup")
        .collection("users")
        .findOne(
          { _id: ObjectId(user_id) },
          {
            projection: { messageQueue: 1, _id: 0 },
          }
        );
    })()
      .then((res) => {
        if (!res) return;
        let msg_que = res.messageQueue;
        if (msg_que.length > 0) {
          msg_que.forEach((person) => {
            socket.emit("receive-personal-message", person, true);
            dbClient
              .db("wassup")
              .collection("users")
              .updateOne(
                { _id: ObjectId(user_id) },
                { $set: { messageQueue: [] } }
              );
          });
        }
      })
      .catch((err) => console.log("error while fetching msgque: ", err));
  });

  socket.on("update-profile", (newInfo) => {
    let u_id = newInfo._id;
    delete newInfo._id;
    dbClient
      .db("wassup")
      .collection("users")
      .updateOne(
        { _id: ObjectId(u_id) },
        {
          $set: newInfo,
        }
      )
      .then((res) => {
        console.log("user profile updated successfully!");
      })
      .catch((err) => {
        console.log("error updating user profile:, ", err);
      });
  });

  socket.on("send-personal-message", (packet) => {
    to_socket = online_user_socket.get(packet.to);
    // console.log("sending msg to socket: ", to_socket, packet.to);
    if (!to_socket) {
      addToMessageQueue("users", packet);
      console.log("personal msg queued successfully!");
    } else {
      to_socket.emit("receive-personal-message", packet, false);
      console.log("personal msg forwarded successfully!");
    }
  });

  /*************************** sign-in/up *************************/

  socket.on("check-account", async (formdata) => {
    // let data = querystring.parse(AES.decrypt(formdata, process.env.SECRET_KEY));
    let data = querystring.parse(formdata);
    let user = await userQueryDB("users", data);
    // console.log("check-account: ", user);
    if (user) {
      if (user.password == md5(data.password)) {
        socket.emit("valid-user-credentials", user);
      } else {
        socket.emit("wrong-user-credentials");
      }
    } else {
      socket.emit("user-not-registered");
    }
  });

  socket.on("new-user-registration", async (formdata) => {
    // let data = querystring.parse(AES.decrypt(formdata, process.env.SECRET_KEY));
    let data = querystring.parse(formdata);
    let user = await userQueryDB("users", data);
    console.log("new-regis: userqueryDB: user: ", user);
    if (user) {
      socket.emit("user-already-registered");
    } else {
      console.log("creating new user...: data: ", data);

      user = new CreateUser(data.email, md5(data.password));
      console.log("new user before insertion: ", user);
      insertDB("users", user)
        .then((res) => {
          console.log("insertDB: inserted successfully", res.insertedId);
          user._id = res.insertedId;
          socket.emit("user-registration-successfull", user);
        })
        .catch((err) => {
          console.log("insertDB error: ", err);
          socket.emit("user-registration-failed", err);
        });
    }
  });

  socket.on("find-if-account-exist", async (formdata) => {
    let data = querystring.parse(formdata);
    let user = await userQueryDB("users", data);
    // console.log("find-if-account-exist: formdata: ", data, "\n", user);
    if (user) {
      let limitedInfoOnly = {
        _id: user._id,
        name: user.name,
        email: user.email,
        about: user.about,
        picture: user.picture,
        picture_hash: user.picture_hash,
      };
      socket.emit("valid-user-credentials", limitedInfoOnly);
    } else {
      socket.emit("user-not-registered");
    }
  });

  socket.on("disconnect", () => {
    online_user_socket.delete(online_socket_user.get(socket.id));
    online_socket_user.delete(socket.id);
    console.log("socket disconnected:", socket.id);
    console.log(online_user_socket);
  });
});
