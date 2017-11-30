module.exports = (app, client, helpers) => {

  let HashController = require("../controllers/HashController")(app, client, helpers);

  app.get("/hashes", HashController.index);
  app.get("/hashes/create", HashController.create);
  app.get("/hashes/update/:key?", HashController.update);

  app.post("/hashes/save", HashController.save);
  app.get("/hashes/delete/:key", HashController.delete);

  app.post("/hashes/add", HashController.add);
  app.get("/hashes/substract/:key/:field", HashController.substract);

};
