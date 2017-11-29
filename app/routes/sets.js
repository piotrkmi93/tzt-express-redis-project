module.exports = (app, client, helpers) => {

  let SetController = require("../controllers/SetController")(app, client, helpers);

  app.get("/sets", SetController.index);
  app.get("/sets/create", SetController.create);
  app.get("/sets/update/:key?", SetController.update);

  app.post("/sets/save", SetController.save);
  app.get("/sets/delete/:key", SetController.delete);

  app.post("/sets/add", SetController.add);
  app.get("/sets/substract/:key/:item", SetController.substract);

  app.post("/sets/operation", SetController.operation);
};
