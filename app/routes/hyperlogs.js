module.exports = (app, client, helpers) => {

  let HyperLogController = require("../controllers/HyperLogController")(app, client, helpers);

  app.get("/hyperlogs", HyperLogController.index);
  app.get("/hyperlogs/create", HyperLogController.create);
  app.get("/hyperlogs/delete/:key", HyperLogController.delete);
  app.post("/hyperlogs/save", HyperLogController.save);
  app.post("/hyperlogs/merge", HyperLogController.merge);
};
