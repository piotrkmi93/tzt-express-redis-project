module.exports = (app, client, helpers) => {

    // load controller
    let ListController = require("../controllers/ListController")(app, client, helpers);

    // set actions
    app.get("/lists", ListController.index);
    app.get("/lists/create", ListController.create);
    app.get("/lists/update/:key?", ListController.update);

    app.post("/lists/save", ListController.save);
    app.get("/lists/delete/:key", ListController.delete);

    app.post("/lists/add", ListController.add);
    app.get("/lists/substract/:key/:item", ListController.substract);

};
