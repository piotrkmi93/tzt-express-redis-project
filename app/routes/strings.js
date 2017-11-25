module.exports = (app, client) => {

    // load controller
    let StringController = require("../controllers/StringController")(app, client);

    // set actions
    app.get("/strings", StringController.index);
    app.get("/strings/create", StringController.create);
    app.get("/strings/update/:key?", StringController.update);
    app.post("/strings/save", StringController.save);
    app.get("/strings/delete/:key?", StringController.delete)

};
