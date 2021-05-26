const $ = require("jquery");
window.$ = window.jQuery = $;
require("jquery-validation");
require("bootstrap");
require("dotenv").config();
const { event, cssNumber } = require("jquery");
const { ipcRenderer, app } = require("electron");
const path = require("path");
const io = require("socket.io-client");
const port = 3000;
const socket = io(`http://localhost:${port}/`);
const PouchDB = require("pouchdb");
const md5 = require("md5");

/////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////// Preload Specific ////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////

const getDate = () => {
  let d = new Date();
  let date = d.toLocaleTimeString();
  date = date.substring(0, date.length - 6);
  let time = d.toDateString();
  time = time.substring(4, time.length - 5);
  return `${date} | ${time}`;
};

const fetchDBUserData = async () => {
  /** load UserProfile from dbUser */
  dbUser
    .get(user._id)
    .then((doc) => {
      (user.name = doc.name),
        (user.picture = doc.picture),
        (user.picture_hash = doc.picture_hash),
        (user.about = doc.about);
    })
    .catch((err) => console.log("error  fectchinfg DBUser Data"));
};

const updateSessionUser = (profile_changed = false) => {
  /**updates the profile of current session's user */
  let rev;
  dbUser
    .get(user._id)
    .then((doc) => {
      rev = doc._rev;
      let val = user.name != null ? user.name : user.email;
      $("#user-label").text(val);
      console.log("userlabe set to: ", $("#user-label").text());
      if (profile_changed) throw "";
    })
    .catch((err) => {
      console.log("no record found or Profile changed, inserting: ", user);
      dbUser
        .put({ _rev: rev, ...user })
        .then((doc) => {
          console.log("saved successfully...");
        })
        .catch((err) => {
          console.log("Error while updating dbUser: ", err);
        });
    });
  // console.log("session user updated");
};

const fetchDBRecentAll = async () => {
  let recentList = null;
  await dbRecent
    .allDocs({
      include_docs: true,
      attachments: true,
    })
    .then(async (result) => {
      console.log("recent db fetched successfully!");
      recentList = result;
      result.rows.forEach((doc) => {
        recentChatWindow.add(doc.doc._id);
      });
    })
    .catch(function (err) {
      console.log("Error showing recent db: ", err);
    });
  return recentList;
};

// const fetchDBRecentOne = async (id) => {
//   if (!id) {
//     console.log("invalid person in fetchDBOne");
//     throw "";
//   }
//   let fetchuser = null;
//   dbRecent
//     .get(id)
//     .then((doc) => {
//       console.log("fetched recent one successfully!");
//       fetchuser = doc;
//     })
//     .catch((err) => {
//       console.log("Error fetching recent one: ", err);
//     });
//   return fetchuser;
// };

const updateRecentWindow = (recentList) => {
  if (recentList === null) {
    return;
  }
  let recentContactArea = $(".contacts_body .contacts");
  recentList.rows.forEach((doc, i) => {
    recentContactArea.append(chatTagHtml(doc.doc));
  });
  console.log("loaded recent window", recentList);
};

const user = ipcRenderer.sendSync("get-dbstate");
if (user === null || user === undefined) {
  alert("Some error occured! Reopen the app");
  app.quit();
  window.close();
}
const dbUser = new PouchDB(`${user.email}#User`);
const dbBlockedUser = new PouchDB(`${user.email}#BlockedUser`);
const dbContacts = new PouchDB(`${user.email}#Contacts`);
const dbRecent = new PouchDB(`${user.email}#Recent`);
// const dbMedia = new PouchDB(`${user.email}#Media`); // for caching... skipping for now, maybe implement in future

/**
 * dbRecent will hold list of all chats that the 'user' recently
 * made in private of group chat. If deleted some chat, it's dbRecent
 * entry will also be deleted. Note that: the actual detailed chats
 * either personal or group are stored in their dedicated DBs with
 * named on their ObjectId as stored on remote DB.
 */

$("#logout-btn").on("click", () => {
  ipcRenderer
    .invoke("remove-login-credentials")
    .then((res) => {
      console.log("remove-login-credentials: resolved: ", res);
      for (let db of [dbUser, dbMedia, dbPersonalChats, dbGroups]) {
        db.close()
          .then((res) => console.log("user_pouchdb closed successfully", res))
          .catch((err) =>
            console.log("error while closing user_pouchdb: ", err)
          );
      }
    })
    .catch((err) => {
      console.log("remove-login-credentials: error: ", err);
    });
});

$("#minimize").on("click", () => {
  ipcRenderer.invoke("window-minimize");
});

$("#maximize").on("click", () => {
  ipcRenderer.invoke("window-maximize");
});

$("#quit").on("click", () => {
  ipcRenderer.invoke("window-quit");
});

socket.on("connect", () => {
  console.log("electron connected");
  socket.emit("mark-user-online", user._id);
});

socket.on("disconnect", (reason) => {
  console.log("chat socket disconnected");
  if (reason === "io server disconnect") {
    // the disconnection was initiated by the server, you need to reconnect manually
    socket.connect();
    console.log("trying reconnect....");
  }
  /**
   * todo: if(reason !== 'io client disconnect') show "offline banner"
   *
   */
  // else the socket will automatically try to reconnect
});

socket.on("receive-personal-message", async (subject, isBulkDocs) => {
  /**
   * isBulkDocs == true => subject is a list of user with ther chat array
   * isBulkDocs == false => subject is a packet/message with '_id' as 'to'
   */
  if (!subject) {
    console.log("error reveiving packet");
    return;
  }
  if (!isBulkDocs) {
    console.log("writing single packet...");
    let packet = subject;
    if (activeWindowUser && packet.to == activeWindowUser._id) {
      dbActiveWindow
        .put(packet)
        .then(async () => {
          $("#message-area").append(personalChatReceivedHtml(packet));
          console.log("message received successfully!");
        })
        .catch((err) => console.log("error receiving message: ", err));
    } else {
      if (!recentChatWindow.has(packet.to)) {
        let person = { _id: packet.to, profileLocallyUnavailable: true };
        // this kind of profile needs to be refreshed explicitly to make
        // user know who the person is. THis is done to reduce overhead in
        // each chat message by avoiding linking all profile details.
        dbRecent
          .put(person)
          .then(() => {
            console.log("added to recentdb successfully!");
            if (!recentChatWindow.has(packet.to)) {
              pushToRecentContactWindow(person, false);
            } else {
              console.log("already in contact window");
            }
          })
          .catch((err) =>
            console.log("recvd msg:Eror adding to recentdb: ", err)
          );
      }
      let dbtemp = new PouchDB(`dbPersonalChat-${user._id}-${packet.to}`);
      dbtemp
        .put(packet)
        .then(() => {
          console.log("message delivered successfully");
        })
        .catch((err) => console.log("error putting to dbtemp: ", err));
      dbtemp.close();
    }
  } else {
    // messages in bulk
    console.log("writing bulk docs...");
    let person = subject;
    let msg_que = person.chat;
    delete person.chat;
    if (activeWindowUser && person._id == activeWindowUser._id) {
      console.log("bulkdocs: inside if:");
      dbActiveWindow
        .bulkDocs(msg_que)
        .then(async () => {
          msg_que.forEach((packet) => {
            console.log("rendering packet...: ", packet);
            $("#message-area").append(personalChatReceivedHtml(packet));
          });
          console.log("message received successfully!");
        })
        .catch((err) => console.log("error receiving message: ", err));
    } else {
      console.log("bulkdocs: inside else:");
      if (!recentChatWindow.has(person._id)) {
        dbRecent
          .put(person)
          .then(() => {
            console.log("added to recentdb successfully!");
            if (!recentChatWindow.has(person._id)) {
              pushToRecentContactWindow(person, false);
            } else {
              console.log("already in contact window");
            }
          })
          .catch((err) =>
            console.log("recvd msg:Eror adding to recentdb: ", err)
          );
      }

      let dbtemp = new PouchDB(`dbPersonalChat-${user._id}-${person._id}`);
      dbtemp
        .bulkDocs(msg_que)
        .then(() => {
          console.log("message delivered successfully");
        })
        .catch((err) => console.log("error putting to dbtemp: ", err));
      dbtemp.close();
    }
  }
});

$(window).on("load", async () => {
  // console.log("DOM loaded");
  await fetchDBUserData();
  updateSessionUser();
  fetchDBRecentAll()
    .then((recentList) => {
      console.log("updating recent list...");
      updateRecentWindow(recentList);
    })
    .catch((err) => console.log("error fetching recentList: ", err));
});

/////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////// Rendering and Controls ///////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////
let viewingUser = null; // this will temporarly hold the user details whose profile is being viewed
let activeWindowUser = null; // this will hold user's/group's details whose chat-window is currently active
let dbActiveWindow = null; // hold active chat-window db.
let activeChatTag = null; // hold active html element in contact-card-widow
let recentChatWindow = new Set(); // holds userid in recent contact window

/** Note that 'viewingUser' and 'activeWindowUser' are NOT the 'user' because the 'user' is who is owning the
 * app. They simply holds the 'other side' of the conversation with 'user'.
 * dbActiveWindow will hold the db instance of currently opened chat window.
 */

const userProfileHtml = (person) => {
  let tt, dd;
  if (person._id != user._id) {
    dd = `type="button"
          data-bs-toggle="modal"
          data-bs-target="#modal-user-profile-fullsize"`;
    tt = "";
  } else {
    dd = "";
    tt = `<input type="file" id="modal-profile-id" accept="image/png, image/jpeg, image/jpg, 
          image/gif, image/webp" onchange="uploadProfilePicture();" style="display: none;" />`;
  }
  return `<div class="container">
        <div class="row">
          <div class="col">
            <!-- Image -->
            <label for="modal-profile-id">
              <img 
                src="${
                  person.picture ? person.picture : "../../public/no_pic.jpg"
                }"
                class="rounded-circle"
                id="modal-profile-img"
                ${dd} 
              />
              ${tt}
            </label>
          </div>
        </div>
        <div class="row">
          <div class="col">
            <!-- Name -->
            <h2>${person.name ? person.name : person.email}</h2>
          </div>
        </div>
        <div class="row">
          <div class="col">
            <!-- About -->
            <p>${
              person.about ? person.about : "Hey there! I'm using Wassup!"
            }</p>
          </div>
        </div>
        <div class="row btn-group">
          <div class="col">
            <!-- Button -->
            <button
              class="btn btn-success w-100"
              type="button"
              id="modal-profile-add-contact"
            >
              Add Contact
            </button>
          </div>
          <div class="col">
            <!-- Button -->
            <button
              class="btn btn-warning w-100"
              type="button"
              id="modal-profile-message"
            >
              Send Message
            </button>
          </div>
          <div class="col">
            <!-- Button -->
            <button
              class="btn btn-danger w-100"
              type="button"
              id="modal-profile-block"
            >
              Block
            </button>
          </div>
        </div>
        <br /><br />
      </div>`;
};

const userContactHtml = (person) => {
  console.log("userContact: ", person._id, person.name);
  return `<div class="d-flex justify-content-start mb-4" 
            id="myContacts-card"
            data-userid="${person._id}"
            type="button"
            data-bs-toggle="modal"
            data-bs-target="#modal-user-profile">
            <div class="img_cont_msg"
                  data-userid="${person._id}"
            >
              <img
                src="${
                  person.picture ? person.picture : "../../public/no_pic.jpg"
                }"
                class="rounded-circle user_img_msg"
              />
            </div>
            <div class="msg_cotainer_rcvd" 
                 style="text-align: center; font-size: medium;" 
                 data-userId="${person._id}"
            >
              <pre>  ${person.name ? person.name : person.email}  </pre>
            </div>
          </div>`;
};

const chatTagHtml = (person) => {
  return `<li class="chatTag"
              data-userid = ${person._id}>
            <div class="d-flex bd-highlight">
              <div class="img_cont">
                <img
                  src="${
                    person.picture ? person.picture : "../../public/no_pic.jpg"
                  }"
                  class="rounded-circle user_img"
                />
              </div>
              <div class="user_info">
                <span>${person.name ? person.name : person.email}</span>
              </div>
            </div>
          </li>`;
};

const chatWindowHeaderHtml = (person) => {
  return `<div class="d-flex bd-highlight">
            <div class="img_cont">
              <img
                src="${
                  person.picture ? person.picture : "../../public/no_pic.jpg"
                }"
                class="rounded-circle user_img"
              />
            </div>
            <div class="user_info">
              <span>${person.name ? person.name : person.email}</span>
            </div>
          </div>`;
};

const uploadProfilePicture = () => {
  let selectedfile = document.getElementById("modal-profile-id").files;
  if (selectedfile && selectedfile.length > 0) {
    let imageFile = selectedfile[0];
    if (imageFile.size > 3000000) {
      alert("Maximum file size allowed 3MB");
      return;
    }
    let fileReader = new FileReader();
    fileReader.onload = (fileLoadedEvent) => {
      let srcData = fileLoadedEvent.target.result;
      $("#modal-profile-img").attr("src", srcData);
    };
    fileReader.readAsDataURL(imageFile);
  } //if
};

const uploadFile = async () => {
  let selectedfile = document.getElementById("attach-file-id").files;
  let attachedData = null;
  if (selectedfile && selectedfile.length > 0) {
    let imageFile = selectedfile[0];
    if (imageFile.size > 3000000) {
      alert("Maximum file size allowed 3MB");
      return;
    }
    let fileReader = new FileReader();
    fileReader.onload = (fileLoadedEvent) => {
      attachedData = fileLoadedEvent.target.result;
      console.log("attachedData: ", attachedData);
      let packet = {
        _id: String(new Date().getTime()),

        to: activeWindowUser._id,
        from: user._id,
        type: 1,
        msg: attachedData,
      };
      dbActiveWindow
        .put(packet)
        .then(async () => {
          if (!socket.connected) await socket.connect();
          socket.emit("send-personal-message", packet);
          $("#message-area").append(personalChatSentHtml(packet));
          console.log("message sent successfully!");
        })
        .catch((err) => console.log("error sending message: ", err));
    };
    fileReader.readAsDataURL(imageFile);
  } //if
};

const inContactList = async (person) => {
  if (person === null) throw "person cann't be null";
  let found = false;
  await dbContacts
    .get(person._id)
    .then((doc) => {
      found = true;
    })
    .catch((err) => {
      found = false;
    });
  console.log("user inContactList: ", found);
  return found;
};

const addToContact = async (person) => {
  if (person === null) throw "person cann't be null";
  console.log("inside addToContact: ");
  await dbContacts
    .get(person._id)
    .then((doc) => {
      console.log("already in contacts");
    })
    .catch((err) => {
      dbContacts
        .put({
          _id: person._id,
          name: person.name,
          about: person.about,
          picture: person.picture,
          picture_hash: person.picture_hash,
        })
        .then((res) => {
          console.log("contact added successfully! ");
        })
        .catch((err) => console.log("error addToContact: ", err));
    });
};

const removeFromContact = async (person) => {
  if (person === null) throw "person cann't be null";
  dbContacts
    .get(person._id)
    .then((doc) => {
      dbContacts
        .remove(doc)
        .then(() => console.log("contact removed successfully!"))
        .catch((err) => console.log("error removing contact: ", err));
    })
    .catch((err) => {
      console.log("error finding Contact: ", err);
    });
};

const inBlockList = async (person) => {
  if (person === null) throw "inBlockList: person cann't be null";
  let found = false;
  await dbBlockedUser
    .get(person._id)
    .then((doc) => {
      found = true;
    })
    .catch((err) => {
      found = false;
    });
  return found;
};

const blockUser = async (person) => {
  if (person === null) throw "person cann't be null";
  dbBlockedUser
    .get(person._id)
    .then((doc) => {
      console.log("already blocked");
    })
    .catch((err) => {
      dbBlockedUser
        .put({
          _id: person._id,
          name: person.name,
          email: person.email,
        })
        .then((res) => console.log("user blocked successfully"))
        .catch((err) => console.log("error blocking user: ", err));
    });
};

const unblockUser = async (person) => {
  if (person === null) throw "person cann't be null";
  dbBlockedUser
    .get(person._id)
    .then((doc) => {
      dbBlockedUser
        .remove(doc)
        .then(() => console.log("contact unblocked successfully!"))
        .catch((err) => console.log("error unblocking user: ", err));
    })
    .catch((err) => console.log("error finding user: ", err));
};

const displayModalProfile = async (person) => {
  $("#modal-user-profile").modal("show");
  $("#modal-user-profile .modal-body").html(userProfileHtml(person));
  $("#modal-user-profile-fullsize").on("show.bs.modal", function () {
    $("#modal-user-profile").modal("hide");
    $("#modal-user-profile-fullsize .modal-body").html(
      `<img src="${
        person.picture ? person.picture : "../../public/no_pic.jpg"
      }" alt="" style="width=100%; margin=auto;"/>`
    );
  });
  $("#modal-user-profile-fullsize").on("hide.bs.modal", function () {
    $("#modal-user-profile").modal("show");
  });
};

const updateModalProfileButtonState = async (person) => {
  if (await inContactList(person)) {
    $("#modal-profile-add-contact").text("Remove");
    $("#modal-profile-add-contact").addClass("remove-contact");
  }
  if (await inBlockList(person)) {
    $("#modal-profile-block").text("Unblock");
    $("#modal-profile-block").addClass("unblock-contact");
  }
  // }
};

const pushToRecentContactWindow = (person, loadWindow = true) => {
  recentChatWindow.add(person._id);
  let target = $(".contacts_body .contacts").prepend(chatTagHtml(person));
  target.removeClass("active-chat-tag");
  if (loadWindow) {
    loadPersonalChatWindow(target[0], person._id);
    // target[0] means get HTML DOM element from Jeury object 'target'
  }
};

$(function () {
  let validationResult = $("form[name='find-user-form']").validate({
    rules: {
      email: {
        required: true,
        email: true,
      },
    },
    messages: {
      email: "Please enter a valid email address",
    },
    errorLabelContainer: "#find-accnt-error-container",
    submitHandler: function (form, event) {
      if (form.elements["email"].value == user.email) {
        validationResult.showErrors({ email: "That's you!" });
        return;
      }

      let formdata = $("form[name='find-user-form']").serialize();
      console.log("finding-user: ", formdata);
      if (!socket.connected) {
        alert("Server connection failed");
        socket.connect();
        return;
      } else {
        socket.emit(
          "find-if-account-exist",
          formdata
          // AES.encrypt(formdata, process.env.SECRET_KEY)
        );
        event.preventDefault();
      }
    },
  });

  socket.on("valid-user-credentials", (person) => {
    viewingUser = person;
    console.log("user-found: ", person.name, person._id);
    $("#modal-find-user-account").modal("hide");
    displayModalProfile(person);
    updateModalProfileButtonState(person);
  });

  socket.on("user-not-registered", () => {
    console.log("user not registered");
    validationResult.showErrors({ email: "This account is not registerd yet" });
  });
});

$("#modal-user-profile").on("click", "#modal-profile-add-contact", (e) => {
  console.log(
    "add-contact btn clicked...: ",
    viewingUser.name,
    viewingUser.email
  );
  if (viewingUser === null) return;
  if ($("#modal-profile-add-contact").hasClass("remove-contact")) {
    removeFromContact(viewingUser)
      .then((res) => {
        $("#modal-profile-add-contact").removeClass("remove-contact");
        $("#modal-profile-add-contact").text("Add Contact");
      })
      .catch((err) => {
        console.log("error removing from contacts: ", err);
      });
  } else {
    addToContact(viewingUser)
      .then((res) => {
        $("#modal-profile-add-contact").addClass("remove-contact");
        $("#modal-profile-add-contact").text("Remove");
      })
      .catch((err) => {
        console.log("error adding contact: ", err);
      });
  }
});

$("#modal-user-profile").on("click", "#modal-profile-block", (e) => {
  if (viewingUser === null) return;
  if ($("#modal-profile-block").hasClass("unblock-contact")) {
    unblockUser(viewingUser)
      .then((res) => {
        $("#modal-profile-block").removeClass("unblock-contact");
        $("#modal-profile-block").text("Block");
      })
      .catch((err) => {
        console.log("error blockign user: ", err);
      });
  } else {
    blockUser(viewingUser)
      .then((res) => {
        $("#modal-profile-block").addClass("unblock-contact");
        $("#modal-profile-block").text("Unblock");
      })
      .catch((err) => {
        console.log("error blocking user: ", err);
      });
  }
});

$("#modal-user-profile").on("click", "#modal-profile-message", (e) => {
  if (viewingUser === null) return;

  dbRecent
    .get(viewingUser._id)
    .then((doc) => {
      console.log("already in recent db");
      if (!recentChatWindow.has(viewingUser._id)) {
        pushToRecentContactWindow(viewingUser);
      } else {
        console.log("already in contact window");
      }
    })
    .catch((err) => {
      dbRecent
        .put(viewingUser)
        .then(() => {
          console.log("added to recentdb successfully!");
          if (!recentChatWindow.has(viewingUser._id)) {
            pushToRecentContactWindow(viewingUser);
          } else {
            console.log("already in contact window");
          }
        })
        .catch((err) => {
          console.log("viewing user: ", viewingUser._id);
          console.log("error adding to recentdb: ", err);
        });
    });
  $("#modal-user-profile").modal("hide");
});

$("#modal-user-profile").on("hide.bs.modal", function () {
  $("#modal-user-profile .modal-footer").empty();
  $("#modal-user-profile .modal-body").empty();
});

$("#modal-find-user-account").on("show.bs.modal", function () {
  let modalAccountBody = $("#modal-find-user-account .modal-body");
  dbContacts
    .allDocs({
      include_docs: true,
      attachments: true,
    })
    .then((result) => {
      result.rows.forEach((doc, i) => {
        // console.log(i, ": ", doc);
        modalAccountBody.append(userContactHtml(doc.doc));
      });
    })
    .catch(function (err) {
      console.log("Error showing all contacts: ", err);
    });
});

$("#modal-find-user-account").on("hide.bs.modal", function () {
  $("#modal-find-user-account .modal-body").empty();
});

$("#modal-block-list").on("show.bs.modal", function () {
  let modalAccountBody = $("#modal-block-list .modal-body");
  dbBlockedUser
    .allDocs({
      include_docs: true,
      attachments: true,
    })
    .then((result) => {
      result.rows.forEach((doc, i) => {
        // console.log(i, ": ", doc);
        modalAccountBody.append(userContactHtml(doc.doc));
      });
    })
    .catch(function (err) {
      console.log("Error showing all contacts: ", err);
    });
});

$("#modal-block-list").on("hide.bs.modal", function () {
  $("#modal-block-list .modal-body").empty();
});

$("#modal-find-user-account").on("click", "#myContacts-card", (e) => {
  $("#modal-find-user-account").modal("hide");
  let user_id = e.target.dataset.userid;
  if (user_id === undefined) user_id = e.target.parentElement.dataset.userid;
  console.log("contact card dataset: ", e.target.dataset);
  console.log("contact card: ", user_id);
  dbContacts
    .get(user_id)
    .then((doc) => {
      viewingUser = doc;
      displayModalProfile(doc);
      updateModalProfileButtonState(doc);
    })
    .catch((err) => console.log("Error reading myContact-card: ", err));
});

$("#modal-block-list").on("click", "#myContacts-card", (e) => {
  $("#modal-block-list").modal("hide");
  let user_id = e.target.dataset.userid;
  if (user_id === undefined) user_id = e.target.parentElement.dataset.userid;
  console.log("contact card dataset: ", e.target.dataset);
  console.log("contact card: ", user_id);
  dbBlockedUser
    .get(user_id)
    .then((doc) => {
      viewingUser = doc;
      displayModalProfile(doc);
      updateModalProfileButtonState(doc);
    })
    .catch((err) => console.log("Error reading myContact-card: ", err));
});

$("#user-label").on("click", async () => {
  /**This is specifically for profile viewing of Owner-User */
  await displayModalProfile(user);
  $("#modal-user-profile .row.btn-group").empty();
  $("#modal-user-profile .modal-content .modal-footer").html(
    `<button id="modal-profile-save-btn" type="button"
     class="btn btn-primary">Save</button>`
  );
  $("#modal-user-profile div h2, #modal-user-profile div p").attr(
    "contenteditable",
    "true"
  );

  $("#modal-profile-save-btn").on("click", async () => {
    let newInfo = { _id: user._id };
    let pichash = md5($("#modal-user-profile div img").prop("src"));
    if (pichash != user.picture_hash) {
      user.picture = $("#modal-user-profile div img").prop("src");
      user.picture_hash = pichash;
      newInfo.picture = user.picture;
      newInfo.picture_hash = pichash;
    }
    if (user.name != $("#modal-user-profile div h2").text()) {
      user.name = $("#modal-user-profile div h2").text();
      newInfo.name = user.name;
    }
    if (user.about != $("#modal-user-profile div p").text()) {
      user.about = $("#modal-user-profile div p").text();
      newInfo.about = user.about;
    }
    if (Object.keys(newInfo).length > 1) {
      if (!socket.connected) await socket.connect();
      socket.emit("update-profile", user);
      updateSessionUser(true);
    } else {
      console.log("no changes made in profile");
    }
    $("#modal-user-profile").modal("hide");
  });
});

$(".card-header.msg_head").on("click", ".user_img", (e) => {
  viewingUser = activeWindowUser;
  displayModalProfile(activeWindowUser);
  updateModalProfileButtonState(activeWindowUser);
});

$(".contacts").on("click", ".chatTag", async (e) => {
  let target = e.target;
  while (target.tagName != "LI") {
    target = target.parentElement;
  }
  // target.classList.add("active-chat-tag");
  loadPersonalChatWindow(target, target.dataset.userid);
});

$("#send_button").on("click", async () => {
  let msg = $("input[name='typing_box']").val().trim();
  console.log("user typed: ", msg);
  $('input[name="typing_box"]').val("");
  if (!msg) return;
  let packet = {
    _id: String(new Date().getTime()),
    to: activeWindowUser._id,
    from: user._id,
    type: 0,
    msg: msg,
  };
  dbActiveWindow
    .put(packet)
    .then(async () => {
      if (!socket.connected) await socket.connect();
      socket.emit("send-personal-message", packet);
      $("#message-area").append(personalChatSentHtml(packet));
      console.log("message sent successfully!");
    })
    .catch((err) => console.log("error sending message: ", err));
});

$('input[name="typing_box"]').on("keypress", function (e) {
  if (e.key == "Enter") {
    $("#send_button").trigger("click");
    console.log("keypressed: ", e.key);
  }
});

$("#message-area").on("click", "#attached-img-file", (e) => {
  let imgdata = e.target.src;
  $("#modal-user-profile-fullsize .modal-body").html(
    `<img src="${imgdata}" alt="" id="attached-img-fullsize" style="margin=auto;"/>`
  );
});
/**************************************************************************************/
/***************************** Personal Chat Specific *********************************/
/**************************************************************************************/

const personalChatReceivedHtml = (message) => {
  /**type=0 for text message
   * type=1 for media
   */
  return `<div class="d-flex justify-content-start mb-4">
            <div class="msg_cotainer_rcvd">
              ${
                message.type == 0
                  ? message.msg
                  : `<img src="${message.msg}" id="attached-img-file" alt="image"
                      type="button"
                      data-bs-toggle="modal"
                      data-bs-target="#modal-user-profile-fullsize"/>`
              }
              <span class="msg_time_rcvd">${getDate()}</span>
            </div>
          </div>`;
};

const personalChatSentHtml = (message) => {
  /**type=0 for text message
   * type=1 for media
   */
  return `<div class="d-flex justify-content-end mb-4">
            <div class="msg_cotainer_send">
            ${
              message.type == 0
                ? message.msg
                : `<img src="${message.msg}" id="attached-img-file" alt="image"
                    type="button"
                    data-bs-toggle="modal"
                    data-bs-target="#modal-user-profile-fullsize"/>`
            }
              <span class="msg_time_send">${getDate()}</span>
            </div>
          </div>`;
};

const loadPersonalChatWindow = (currChatTag, id) => {
  if (!id) {
    alert("some error occured! reload the app");
    return;
  }
  console.log("loading in chat window id: ", id);
  if (activeChatTag && activeChatTag.dataset.userid != id) {
    activeChatTag.classList.remove("active-chat-tag");
  }
  if (!activeChatTag || activeChatTag.dataset.userid != id) {
    try {
      dbActiveWindow.close();
    } catch (e) {
      console.log("error caught while closing dbActiveWindow:", e);
    }
    activeChatTag = currChatTag;
    activeChatTag.classList.add("active-chat-tag");
    dbRecent
      .get(id)
      .then((doc) => {
        activeWindowUser = doc;
        // chat windows header
        $(".card-header.msg_head").html(chatWindowHeaderHtml(doc));
        // chat window body
        loadPersonalChatWindow_body(doc);
      })
      .catch((err) => console.log("error loading chat window: ", err));
  } else {
    console.log("already viewing active window");
  }
};

const loadPersonalChatWindow_body = async (person) => {
  if (!person) {
    console.log("person cann't be empty");
    throw "";
  }
  $("#chat-window-input-group").removeClass("chat-window-disabled");
  let msg_area = $("#message-area");
  msg_area.html(""); // reset the window body
  dbActiveWindow = new PouchDB(`dbPersonalChat-${user._id}-${person._id}`);
  dbActiveWindow
    .allDocs({
      include_docs: true,
      attachments: true,
    })
    .then((result) => {
      result.rows.forEach((doc, i) => {
        // console.log("loading chats: ", i, ": ", doc);
        if (doc.doc.from == user._id)
          msg_area.append(personalChatSentHtml(doc.doc));
        else msg_area.append(personalChatReceivedHtml(doc.doc));
      });
    })
    .catch(function (err) {
      console.log("Error showing all contacts: ", err);
    });
};

/**************************************************************************************/
/******************************* Group Chat Specific **********************************/
/**************************************************************************************/
