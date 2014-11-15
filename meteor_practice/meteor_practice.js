Tasks = new Mongo.Collection("tasks");

if (Meteor.isClient) {
  // This code only runs on the client
  Meteor.subscribe("tasks");
  Meteor.call("githubRequest");

  Template.body.helpers({

    tasks: function () {
      if (Session.get("hideCompleted")) {
      // If hide completed is checked, filter tasks
      return Tasks.find({checked: {$ne: true}}, {sort: {createdAt: -1}});
      } 
      else {
      // Otherwise, return all of the tasks
        return Tasks.find({}, {sort: {createdAt: -1}});
      }
    },

    hideCompleted: function () {
      return Session.get("hideCompleted");
    },
    
    incompleteTasks: function () {
      return Tasks.find({checked: {$ne: true}}).count();
    }

  });


  Template.body.events({

    "submit .new-task": function (event) {
      // This function is called when the new task form is submitted
      var text = event.target.text.value;
     // Meteor.call("addTask", text);
      // Clear form
       Meteor.call("githubRepos", text);
      event.target.text.value = "";
      // Prevent default form submit
      return false;
    },

    "change .hide-completed input": function (event) {
      Session.set("hideCompleted", event.target.checked);
    }
  });

  Template.task.events({

    "click .toggle-checked": function () {
    // Set the checked property to the opposite of its current value
      Meteor.call("setChecked", this._id, ! this.checked);
    },

    "click .delete": function () {
      Meteor.call("deleteTask", this._id);
    },
    "click .toggle-private": function () {
      Meteor.call("setPrivate", this._id, ! this.private);
    }
  });
  Template.task.helpers({
    isOwner: function () {
      return this.owner === Meteor.userId();
    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
 

}
Meteor.methods({
  addTask: function (text) {
    // Make sure the user is logged in before inserting a task
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.insert({
      text: text,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });
  },
  deleteTask: function (taskId) {
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
    // If the task is private, make sure only the owner can delete it
      throw new Meteor.Error("not-authorized");
    }
    Tasks.remove(taskId);
  },
  setChecked: function (taskId, setChecked) {
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can check it off
      throw new Meteor.Error("not-authorized");
    }
    Tasks.update(taskId, { $set: { checked: setChecked} });
  },
  setPrivate: function (taskId, setToPrivate) {
  var task = Tasks.findOne(taskId);

  if (task.owner !== Meteor.userId()) {
    throw new Meteor.Error("not-authorized");
  }

    Tasks.update(taskId, { $set: { private: setToPrivate } });
  },
  githubRequest: function () {
    try{
    this.unblock();
    Meteor.http.call("GET", "https://api.github.com/repos/murraycat/meteor_practice/issues",function(err,result){
     var myArr = result.data;

    
  }) ;
  } catch(e){
    }
  },
   githubRepos: function (user_name) {
    try{
    this.unblock();
    Tasks.remove({owner:Meteor.userId()});
    Meteor.http.call("GET", "https://api.github.com/users/"+user_name+"/repos",function(err,result){
     var myArr = result.data;
     console.log(result.data);
    
     for(i = 0; i < myArr.length; i++) {
      Tasks.insert({
      text: myArr[i].description,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: myArr[i].full_name,
      url: myArr[i].clone_url
      });
      }
  }) ;
  } catch(e){
    }
  }

  });


if (Meteor.isServer) {
  Meteor.publish("tasks", function () {
   return Tasks.find({owner: this.userId});
  });
}