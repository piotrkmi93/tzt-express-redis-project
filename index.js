const   express = require("express"),
        bodyParser= require('body-parser'),
        path = require("path");

let app = express();

// Enable Assets
app.use("/static", express.static("assets"));

// bodyParser config
app.use(bodyParser.urlencoded({extended: true}));

// View Engine config
app.set("views", path.join(__dirname, "./app/views"));
app.set("view engine", "pug");

// Routes with Controllers
require("./app/routes/routes")(app);

let server = app.listen(3000, () => {
    let host = server.address().address,
        port = server.address().port;
    console.log(`Server started on ${host}:${port}`);
});