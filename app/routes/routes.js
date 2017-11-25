module.exports = (app, client) => {

    // modules routes
    require("./strings")(app, client);

    // main routes

    app.get('/', (req, res) =>
        res.render("index", {
            title: "Sprawozdanie nr 1 - Redis + Node.js + Express + other magic stuff"
        })
    );

};
