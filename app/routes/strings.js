module.exports = (app, client, helpers) => {

    // load controller
    let StringController = require("../controllers/StringController")(app, client, helpers);

    // set actions
    app.get("/strings", StringController.index);
    app.get("/strings/create", StringController.create);
    app.get("/strings/update/:key?", StringController.update);
    app.get("/strings/delete/:key?", StringController.delete)
    app.get("/strings/increment/:key?", StringController.increment);
    app.get("/strings/decrement/:key?", StringController.decrement);

    app.post("/strings/save", StringController.save);
};
