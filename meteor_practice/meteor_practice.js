Tasks = new Mongo.Collection("tasks");
var token;

if (Meteor.isClient) {
  // This code only runs on the client
  Meteor.subscribe("tasks");

  
  var authCode;
  var url = window.location.href;
  var n = url.indexOf("code=")+5;
  if(n!=4) {
  authCode=url.substring(n,url.length); 
  Meteor.call("authenticateGithub", authCode);
  console.log(authCode);
  }
  
  

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
    },
    /*"click .login-button": function(){
      window.open('https://github.com/login/oauth/authorize?client_id=83d7d25834d9f658c7ba')
    }*/
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
    }
  });
  Template.task.helpers({
    hasIssues: function () {
      if(this.number_of_issues>0){
        return true;
      }
    }
  });
  Template.task.helpers({
    isRepo: function () {
      if (this.isRepo==0){
        return false;
      }else{
        return true;
      }
    }
  });
  Template.task.helpers({
    isNotRepo: function () {
      if (this.isRepo==0){
        return true;
      }else{
        return false;
      }
    }
  });
/*
  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
Accounts.loginServiceConfiguration.remove({
    service : 'github'
});

Accounts.loginServiceConfiguration.insert({
    service : 'github',
    clientId: 'YOUR CLIENT ID',
    secret  : 'YOUR SECRET ID'
});
Accounts.onCreateUser(function(options,user){
    var accessToken = user.services.github.accessToken,
        result,
        profile;

    result = Meteor.http.get('https://api.github.com/user',{
        params : {
            access_token : accessToken
        },
        headers: {"User-Agent": "Meteor/1.0"}
    });

    if(result.error){
        console.log(result);
        throw result.error
    }

    profile = _.pick(result.data,
        'login',
        'name',
        'avatar_url',
        'url',
        'company',
        'blog',
        'location',
        'email',
        'bio',
        'html_url'
    );

    user.profile = profile;

    return user;
});
*/

}
Meteor.methods({

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
    Meteor.http.call("GET", "https://api.github.com/repos/"+user_name+"/issues",function(err,result){
     var myArr = result.data;
    for(i = 0; i < myArr.length; i++) {
      Tasks.insert({
      text: "",
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: myArr[i].title,
      url: myArr[i].clone_url,
      isRepo: 0

      });
    }
  }) ;
  } catch(e){
    }
  }
  ,authenticateGithub: function (authCode) {
     this.unblock();
      var client_id = "";
      var client_secret ='';
    try{
            //header: { 'Access-Control-Allow-Origin': "*" },
      this.unblock();
      var url = "https://github.com/login/oauth/access_token";
        var formData = new FormData();
       
        formData.append('client_id', client_id);
        formData.append('client_secret', client_secret);
        formData.append('code', authCode);

       
        var invocation = new XMLHttpRequest();
        invocation.open('POST', url, true);
        invocation.withCredentials = "true";
        invocation.setRequestHeader('Access-Control-Allow-Origin', '*');
        
        invocation.onload = function(e) {
          if (this.status == 200) {
            console.log(this.response);
          }
        };
        invocation.send(formData);
         /*
       Meteor.http.call("POST", "https://github.com/login/oauth/access_token",
        { data:{
        client_id: client_id, //your GitHub client_id
        client_secret: client_secret,  //and secret
        code: authCode} ,headers:{'Access-Control-Allow-Origin': "*",'Accept': 'application/json'}  },
          function (error, result) {
            Session.set('external_server_data', result);
            if (!error) {
              console.log(result);
            }
          });   
          */    
      


    

  } catch(e){
     console.log(e);
    }
  }

});


if (Meteor.isServer) {
  Meteor.publish("tasks", function () {
   return Tasks.find({owner: this.userId});
  });
}