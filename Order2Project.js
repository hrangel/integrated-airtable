var Airtable = require('airtable');
var Client = require('node-rest-client').Client;

var base = null;
var airtableKey = "[Airtable_Key]";
var airtableTable = "[Airtable_Table]";
var workstackToken = "[Workstack_Token]";

module.exports = {
  readProject: function() {
  },
  listItems: function(projectName, callback) {
    base('Items').select({
      // maxRecords: 3,
      filterByFormula: `Projeto = "${projectName}"`,
      view: "Grid view"
    }).eachPage(function page(records, fetchNextPage) {
      // This function (`page`) will get called for each page of records.

      // records.forEach(function(record) {
      //     console.log('Retrieved', record.get('Items'));
      // });

      // To fetch the next page of records, call `fetchNextPage`.
      // If there are more records, `page` will get called again.
      // If there are no more records, `done` will get called.
      callback(records);

    }, function done(err) {
      if (err) { console.error(err); return; }
    });
  },

  listPriceItems: function(projectName, itemName, callback) {
    base('Precificação').select({
      // maxRecords: 3,
      filterByFormula: `AND(Projeto = "${projectName}", Item = "${itemName}")`,
      view: "Grid view"
    }).eachPage(function page(records, fetchNextPage) {
      // This function (`page`) will get called for each page of records.

      // records.forEach(function(record) {
          // console.log('Retrieved', record.get('Items'));
      // });

      // To fetch the next page of records, call `fetchNextPage`.
      // If there are more records, `page` will get called again.
      // If there are no more records, `done` will get called.
      callback(records);

    }, function done(err) {
      if (err) { console.error(err); return; }
    });
  },

  getAirtableProject: function(name, callback, callbackError) {
    base('Orçamentos').select({
      // maxRecords: 3,
      filterByFormula: `orcamento = "${name}"`,
      view: "Grid view"
    }).eachPage(function page(records, fetchNextPage) {
      if (records.length > 0) {
        callback(records[0]);
      }

    }, function done(err) {
      if (err) { console.error(err); return; }
    });
  },

  getWorkstackProject: function(projectId, callback) {
    var settings = {
      "async": true,
      "crossDomain": true,
      "method": "GET",
      "headers": {
        "accept": "application/json"
      }
    }

    var client = new Client();
    client.get("https://app.workstack.io/api/projects/" + projectId + '?api_token=' + workstackToken, function (res, response) {
      // parsed response body as js object
      // console.log(res);
      // raw response
      // console.log(response);

      callback(res.data)
    });
  },

  findTodoList: function(baseItemName, workstackProject) {
    for (var i = 0; i < workstackProject.todolists.length; i++) {
      var todoList = workstackProject.todolists[i];
      if (todoList.name == baseItemName) {
        return todoList;
      }
    }
    return null;
  },

  getOrCreateTodoList: function(item, workstackProject, difByHour, callback) {
    var self = this;
    var name = item.get('Items');
    var todoList = self.findTodoList(name, workstackProject);
    if (todoList) {
      self.updateTodoList(todoList.id, name, workstackProject.id, minutes, todoList, callback);
    } else {
      var dif = item.get('Soma Diff');
      var minutes = dif * difByHour * 60.0;
      self.createTodoList(name, workstackProject.id, minutes, callback);
    }
  },

  getTodoList: function(todoListId, callback) {
    var settings = {
      "async": true,
      "crossDomain": true,
      "method": "GET",
      "headers": { "accept": "application/json" }
    }

    var client = new Client();
    client.get("https://app.workstack.io/api/todolists/" + todoListId + "?api_token=" + workstackToken, function (res, response) {
      // parsed response body as js object
      // console.log(res);
      // raw response
      // console.log(response);

      callback(response.data)
    });
  },

  createTodoList: function(name, projectId, minutes, callback) {
    var settings = {
      "async": true,
      "crossDomain": true,
      "method": "POST",
      "data": {
        "project_id": projectId,
        "name": name,
        "minutes": minutes,
        "completed": false
      },
      "headers": { "accept": "application/json","Content-Type": "application/json" }
    }

    var client = new Client();
    client.post("https://app.workstack.io/api/todolists" + "?api_token=" + workstackToken, settings, function (res, response) {
      // parsed response body as js object
      // console.log(res);
      // raw response
      // console.log(res);

      todoList = res.data;
      if (!todoList.hasOwnProperty('todos') || !todoList.todos)
        todoList.todos = [];
      callback(todoList);
    });
  },

  updateTodoList: function(id, name, projectId, minutes, original, callback) {
    var settings = {
      "async": true,
      "crossDomain": true,
      "method": "PUT",
      "data": {
        "project_id": projectId,
        "name": name,
        "minutes": minutes,
        // "completed": false
      },
      "headers": { "accept": "application/json","Content-Type": "application/json" }
    }

    var client = new Client();
    client.put("https://app.workstack.io/api/todolists/" + id + "?api_token=" + workstackToken, settings, function (res, response) {
      // parsed response body as js object
      // console.log(res);
      // raw response
      // console.log(res);

      todoList = res.data;
      todoList.todos = original.todos;
      callback(todoList);
    });
  },

  findTodo: function(baseItemName, todoList, workstackProject) {
    for (var i = 0; i < todoList.todos.length; i++) {
      var todo = todoList.todos[i];
      if (todo.name == baseItemName) {
        return todo;
      }
    }
    return null;
  },

  getOrCreateTodo: function(priceItem, todoList, workstackProject, difByHour, callback) {
    var self = this;
    var name = priceItem.get('Tasks');
    var todo = self.findTodo(name, todoList, workstackProject);
    if (todo) {
      self.updateTodo(todo.id, name, todoList.id, workstackProject.id, minutes, todo, callback);
      // callback(todo);
    } else {
      var dif = priceItem.get('Resultado');
      var minutes = dif * difByHour * 60.0;
      self.createTodo(name, todoList.id, workstackProject.id, minutes, callback);
    }
  },

  updateTodo: function(id, name, todoListId, projectId, minutes, original, callback) {
    var settings = {
      "async": true,
      "crossDomain": true,
      "method": "PUT",
      "data": {
        "project_id": projectId,
        "todolist_id": todoListId,
        "name": name,
        "minutes": minutes,
        // "completed": false
      },
      "headers": { "accept": "application/json","Content-Type": "application/json" }
    }
    // console.log(settings);

    var client = new Client();
    client.put("https://app.workstack.io/api/todos/" + id + "?api_token=" + workstackToken, settings, function (res, response) {
      // parsed response body as js object
      // console.log(res);
      // raw response
      // console.log(response);
      callback(res.data);
    });
  },

  createTodo: function(name, todoListId, projectId, minutes, callback) {
    var settings = {
      "async": true,
      "crossDomain": true,
      "method": "POST",
      "data": {
        "project_id": projectId,
        "todolist_id": todoListId,
        "name": name,
        "minutes": minutes,
        "completed": false
      },
      "headers": { "accept": "application/json","Content-Type": "application/json" }
    }
    // console.log(settings);

    var client = new Client();
    client.post("https://app.workstack.io/api/todos" + "?api_token=" + workstackToken, settings, function (res, response) {
      // parsed response body as js object
      // console.log(res);
      // raw response
      // console.log(response);
      callback(res.data);
    });
  },

  setKeys: function(airtableApiKey, airtableApiTable, userWorkstackToken) {
    airtableKey = airtableApiKey;
    airtableTable = airtableApiTable;
    workstackToken = userWorkstackToken;

    base = new Airtable({apiKey: airtableKey}).base(airtableTable);
  },

  saveToProject: function(airtableProjectName, workstackProjectID, airtableApiKey, airtableApiTable, userWorkstackToken) {
    this.setKeys(airtableApiKey, airtableApiTable, userWorkstackToken);

    var self = this;
    self.getWorkstackProject(workstackProjectID, function(workstackProject) {
      if (!workstackProject)
        return;

      console.log('Workstack Project: ' + workstackProject.name)
      console.log(workstackProject)
      if (!workstackProject.todolists)
        workstackProject.todolists = [];

      self.getAirtableProject(airtableProjectName, function(project) {
        var projectName = project.get('orcamento');
        console.log('Airtable Project: ' + projectName)

        var difByHour = project.get('Dificuldade/Hora');
        if (!difByHour)
          difByHour = 0;

        self.listItems(projectName, function(items) {
          items.forEach(function(item) {
            var itemName = item.get('Items');
            console.log('Airtable Item: ' + itemName);

            self.getOrCreateTodoList(item, workstackProject, difByHour, function(todoList) {
              console.log('TODO List: ' + todoList.name);

              self.listPriceItems(projectName, itemName, function(priceItems) {
                priceItems.forEach(function(priceItem) {
                  console.log('Airtable Price Item: ' + priceItem.get('Tasks'));

                  self.getOrCreateTodo(priceItem, todoList, workstackProject, difByHour, function(todo) {
                    console.log('TODO: ' + todo.name);
                  });
                });
              });
            });
          });
        });
      });
    });
  }

}
