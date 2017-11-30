module.exports = (app, client, helpers) => {

  let SortedSetController = require("../controllers/SortedSetController")(app, client, helpers);

  app.get("/sorted_sets", SortedSetController.index);
  app.get("/sorted_sets/create", SortedSetController.create);
  app.get("/sorted_sets/update/:key?", SortedSetController.update);

  app.post("/sorted_sets/save", SortedSetController.save);
  app.get("/sorted_sets/delete/:key", SortedSetController.delete);

  app.post("/sorted_sets/add", SortedSetController.add);
  app.get("/sorted_sets/substract/:key/:value", SortedSetController.substract);

  app.post("/sorted_sets/operation", SortedSetController.operation);

};
