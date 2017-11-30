module.exports = (app, client, helpers) => {

  let BitmapController = require("../controllers/BitmapController")(app, client, helpers);

  app.get("/bitmaps", BitmapController.index);
  app.get("/bitmaps/create", BitmapController.create);
  app.get("/bitmaps/update/:key", BitmapController.update);
  app.get("/bitmaps/delete/:key", BitmapController.delete);
  app.post("/bitmaps/save", BitmapController.save);

};
