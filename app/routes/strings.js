module.exports = app => {

    // load controller
    let StringController = require("../controllers/StringController")(app);

    // set actions
    app.get("/strings", StringController.index);
    app.get("/strings/form/:key?", StringController.form);

};