module.exports = () => {

    return {

        index: (req, res) => {
            res.render("strings/index", {
                title: "Ciągi znaków"
            });
        },

        form: (req, res) => {
            let title = "Ciągi znaków - formularz ";

            if(typeof req.params.key !== "undefined"){
                title += "edycji klucza";
            } else {
                title += "tworzenia nowego klucza";
            }

            res.render("strings/index", {
                title: title
            });
        }

    };

};