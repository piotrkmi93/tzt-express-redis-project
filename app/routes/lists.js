module.exports = (app, client, helpers) => {

    // load controller
    let ListController = require("../controllers/ListController")(app, client, helpers);

    // set actions
    app.get("/lists", ListController.index);
    app.get("/lists/create", ListController.create);

    app.post("/lists/save", ListController.save);
    // app.get("/strings/update/:key?", StringController.update);
    // app.post("/strings/save", StringController.save);
    // app.get("/strings/delete/:key?", StringController.delete)

};
