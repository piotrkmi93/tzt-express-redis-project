module.exports = (app, client) => {

    // helper functions
    let helpers = require("../helpers/functions")(app, client);

    // modules routes
    require("./strings")(app, client, helpers);
    require("./lists")(app, client, helpers);
    require("./sets")(app, client, helpers);
    // require("./sorted_sets")(app, client, helpers);
    // require("./hashes")(app, client, helpers);
    // require("./bitmaps")(app, client, helpers);
    // require("./hyperlogs")(app, client, helpers);

    // main routes
    app.get('/', (req, res) =>
        res.render("index", {
            title: "Sprawozdanie nr 1 - Redis + Node.js + Express + other magic stuff"
        })
    );

};
