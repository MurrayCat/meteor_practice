Tasks = new Mongo.Collection("tasks");
ClosedIssues = new Mongo.Collection("closed_issues");
var token;

if (Meteor.isClient) {
  // This code only runs on the client
  Meteor.subscribe("tasks");



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
    },
    isSessionRepo: function () {
        return Session.get("Repo");
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
    },

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
     Meteor.call("githubIssues", this.username);
     // Meteor.call("setPrivate", this._id, ! this.private);
    }
  });
  Template.task.helpers({
    isOwner: function () {
      return this.owner === Meteor.userId();
    },
    hasIssues: function () {
      if(this.number_of_issues>0){
        return true;
      }
    },
    isRepo: function () {
      if (this.isRepo==0){
        Session.set("Repo", true);
        return false;
      }else{
        Session.set("Repo", false);
        return true;
      }
    },
    isNotRepo: function () {
      if (this.isRepo==0){
        Session.set("Repo", false);
        return true;
      }else{
        Session.set("Repo", true);
        return false;
      }
    }
  });



  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });





}
Meteor.methods({

  deleteTask: function (taskId) {
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
    // If the task is private, make sure only the owner can delete it
      throw new Meteor.Error("not-authorized");
    }
    Meteor.call("CloseGithubIssues",task.issue_number,"closed");
    Tasks.remove(taskId);

  },
  setChecked: function (taskId, setChecked) {
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If the task is private, make sure only the owner can check it off
      throw new Meteor.Error("not-authorized");
    }
    if(setChecked){
    Meteor.call("CloseGithubIssues",task.issue_number,"closed");
    }else{
      Meteor.call("CloseGithubIssues",task.issue_number,"open");
    }
    Tasks.update(taskId, { $set: { checked: setChecked} });
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
    Session.set("Repo", false);
    for(i = 0; i < myArr.length; i++) {
        Tasks.insert({
        text: myArr[i].description,
        createdAt: new Date(),
        owner: Meteor.userId(),
        username: myArr[i].full_name,
        url: myArr[i].clone_url,
        isRepo: 1,
        number_of_issues: myArr[i].open_issues
        });
    }
  }) ;
  } catch(e){
    }
  },
    githubIssues: function (user_name) {
    try{
    this.unblock();
    Tasks.remove({owner:Meteor.userId()});
    Session.set("Repo", true);
    Meteor.http.call("GET", "https://api.github.com/repos/"+user_name+"/issues",function(err,result){
     var myArr = result.data;
     console.log(myArr);
    for(i = 0; i < myArr.length; i++) {
      Tasks.insert({
      text: "",
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: myArr[i].title,
      url: myArr[i].clone_url,
      isRepo: 0,
      issue_number:myArr[i].number

      });
    }
  }) ;
  } catch(e){
    }
  },
   CloseGithubIssues: function (number, state) {
    try{
      this.unblock();
      Meteor.http.call("PATCH",
        "https://api.github.com/repos/MurrayCat/meteor_practice/issues/"+number,{data:{state:state} ,
        headers:{'Accept':'application/vnd.github.v3.raw+json','Content-Type':'application/json;charset=UTF-8','Authorization':'token #'}},
        function (error, result) {
        Session.set('external_server_data', result);
          if (!error) {
            console.log(result);
          }
        });
    }
    catch(e){
      console.log(e);
    }
  }


});


if (Meteor.isServer) {
  Meteor.publish("tasks", function () {
   return Tasks.find({owner: this.userId});
  });
}
