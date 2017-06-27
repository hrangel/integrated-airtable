var Airtable = require('airtable');
var Trello = require("node-trello");

var base = null;
var airtableKey = "[Airtable_Key]";
var airtableTable = "[Airtable_Table]";
var trelloApi = "[Trello_Api]";
var trelloToken = "[Trello_Token]";

module.exports = {
  readProject: function() {
  },
  listItems: function(projectName, callback) {
    base('Items').select({
      // maxRecords: 3,
      filterByFormula: `FIND("${projectName}", Projeto) > 0`,
    }).eachPage(function page(records, fetchNextPage) {
      // This function (`page`) will get called for each page of records.

      // records.forEach(function(record) {
      //     console.log('Retrieved', record.get('Items'));
      // });

      // To fetch the next page of records, call `fetchNextPage`.
      // If there are more records, `page` will get called again.
      // If there are no more records, `done` will get called.
      // console.log(records);
      callback(records);

    }, function done(err) {
      if (err) { console.error(err); return; }
    });
  },

  listPriceItems: function(projectName, itemName, callback) {
    base('Precificação').select({
      // maxRecords: 3,
      filterByFormula: `AND((FIND("${projectName}", Projeto) > 0), (FIND("${itemName}", Item) > 0))`,
      // view: "Grid view"
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
      // view: "Grid view"
    }).eachPage(function page(records, fetchNextPage) {
      if (records.length > 0) {
        callback(records[0]);
      }

    }, function done(err) {
      if (err) { console.error(err); return; }
    });
  },

  getTrelloProject: function(projectId, callback) {
    var settings = {
      "async": true,
      "crossDomain": true,
      "method": "GET",
      "headers": {
        "accept": "application/json"
      }
    }

    trelloClient.get("/1/boards/" + projectId, function(err, data) {
      if (err) throw err;
      // console.log(data);
      callback(data);
    });
  },

  getOrCreateCardList: function(name, trelloProject, callback) {
    var self = this;
    self.findCardList(name, trelloProject, function(cardList) {
      if (cardList) {
        callback(cardList);
      } else {
        self.createCardList(name, trelloProject.id, callback);
      }
    });
  },

  findCardList: function(name, trelloProject, callback) {
    trelloClient.get("/1/boards/" + trelloProject.id + '/lists', { fields: 'all' }, function(err, data) {
      if (err) throw err;
      // console.log(data);
      if (data.length > 0) {
        for (var i = 0; i < data.length; i++) {
          var list = data[i];
          if (list.name == name) {
            callback(list);
            return list;
          }
        }
      }
      callback(null);
      return null;
    });
  },

  createCardList: function(name, boardId, callback) {
    var data = {
      "idBoard": boardId,
      "name": name,
      "pos": "top"
    }

    trelloClient.post("/1/lists", data, function (err, responseData) {
      if (err) throw err;
      // console.log(responseData);
      callback(responseData);
    });
  },

  getOrCreateCardLabel: function(name, trelloProject, callback) {
    var self = this;
    self.findCardLabel(name, trelloProject, function(cardLabel) {
      if (cardLabel) {
        callback(cardLabel);
      } else {
        self.createCardLabel(name, trelloProject, callback);
      }
    });
  },

  findCardLabel: function(name, trelloProject, callback) {
    function findLabel(labels, name) {
      for (var i = 0; i < labels.length; i++) {
        var label = labels[i];
        if (label.name == name) {
          return label;
        }
      }
      return null;
    }

    if (trelloProject.labels) {
      var label = findLabel(trelloProject.labels, name);
      callback(label);
      return label;
    } else {
      trelloClient.get("/1/boards/" + trelloProject.id + '/labels', { fields: 'all' }, function(err, data) {
        if (err) throw err;
        // console.log(data);
        if (!data)
          data = [];

        trelloProject.labels = data;
        if (trelloProject.labels.length > 0) {
          var label = findLabel(trelloProject.labels, name);
          callback(label);
          return label;
        }
        callback(null);
        return null;
      });
    }
  },

  createCardLabel: function(name, trelloProject, callback) {
    var data = {
      "name": name,
      "color": null
    }

    trelloClient.post("/1/boards/" + trelloProject.id + '/labels', data, function (err, responseData) {
      if (err) throw err;
      trelloProject.labels.push(responseData);
      callback(responseData);
    });
  },

  findCard: function(name, cardLabel, cardList, trelloProject, callback) {
    function findCard(cards, name) {
      for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        if (card.name == name) {
          callback(card);
          return card;
        }
      }
      return null;
    }

    if (trelloProject.cards) {
      var card = findCard(trelloProject.cards, name);
      callback(card);
      return card;
    } else {
      trelloClient.get("/1/boards/" + trelloProject.id + '/cards', { fields: 'name, desc' }, function(err, data) {
        if (err) throw err;
        // console.log(data);
        if (!data)
          data = [];

        trelloProject.cards = data;
        if (trelloProject.cards.length > 0) {
          var card = findCard(trelloProject.cards, name);
          callback(card);
          return card
        }
        callback(null);
        return null;
      });
    }
  },

  getOrCreateCard: function(priceItem, cardLabel, cardList, trelloProject, difByHour, callback) {
    var self = this;
    var name = priceItem.get('Tasks');
    self.findCard(name, cardLabel, cardList, trelloProject, function(card) {
      if (card) {
        callback(card);
      } else {
        var dif = priceItem.get('Resultado');
        var minutes = dif * difByHour * 60.0;
        self.createCard(name, cardLabel.id, cardList, trelloProject, minutes, callback);
      }
    });
  },

  createCard: function(name, cardLabelId, cardList, trelloProject, minutes, callback) {
    var data = {
      "name": name,
      "desc": "AllBoardsCalendar=>Time(" + minutes + "m)",
      "idList": cardList.id,
      "idLabels": cardLabelId,
    }

    trelloClient.post("/1/cards", data, function (err, responseData) {
      if (err) throw err;
      trelloProject.cards.push(responseData);
      callback(responseData);
    });
  },

  setKeys: function(airtableApiKey, airtableApiTable, trelloApiKey, trelloApiToken) {
    airtableKey = airtableApiKey;
    airtableTable = airtableApiTable;
    trelloApi = trelloApiKey;
    trelloToken = trelloApiToken;

    base = new Airtable({apiKey: airtableKey}).base(airtableTable);
    trelloClient = new Trello(trelloApi, trelloToken);
  },

  saveToProject: function(airtableProjectName, trelloProjectID, airtableApiKey, airtableApiTable, trelloApiKey, trelloApiToken) {
    this.setKeys(airtableApiKey, airtableApiTable, trelloApiKey, trelloApiToken);

    var self = this;
    self.getTrelloProject(trelloProjectID, function(trelloProject) {
      if (!trelloProject)
        return;

      console.log('Trello Project: ' + trelloProject.name);

      self.getAirtableProject(airtableProjectName, function(project) {
        console.log('Airtable Project: ' + airtableProjectName)

        var difByHour = project.get('Dificuldade/Hora');
        if (!difByHour)
          difByHour = 0;

        self.getOrCreateCardList("Entrada", trelloProject, function(cardList) {
          console.log('CARD List: ' + cardList.name);
          self.listItems(airtableProjectName, function(items) {
            items.forEach(function(item) {
              var itemName = item.get('Items');
              console.log('Airtable Item: ' + itemName);
              self.getOrCreateCardLabel(itemName, trelloProject, function(cardLabel) {
                self.listPriceItems(airtableProjectName, itemName, function(priceItems) {
                  priceItems.forEach(function(priceItem) {
                    var priceItemName = priceItem.get('Tasks');
                    console.log('Airtable Price Item: ' + priceItemName);

                    self.getOrCreateCard(priceItem, cardLabel, cardList, trelloProject, difByHour, function(card) {
                      console.log('CARD: ' + card.name);
                    });
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
