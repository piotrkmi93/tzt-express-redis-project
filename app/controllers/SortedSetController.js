module.exports = (app, client, helpers) => {

  let self = {

    index: (res, req) => {
      client.keys("kss_*", (err, keys) => zrangeNext(
        0,
        keys,
        array => res.render("sorted_sets/index", {
          title: "Zbiory",
          sets: array
            .sort(helpers.sortByTime)
            .map(helpers.humanTime)
            .map(helpers.withoutPrefix)
        }),
        key => helpers.throwError(res, `Nie znaleziono klucza "${key}"`)
      ));
    },

    create: (res, req) => {
      res.render("sorted_sets/form", {
        title: "Tworzenie nowego zbioru posortowanego",
        kss: {
          key: "",
          size: req.query.size || 0,
          scores: [],
          values: [],
          time: -1
        }
      });
    },

    update: (res, req) => {
      // TODO
    },

    save: (res, req) => {
      // TODO
    },

    delete: (res, req) => {
      // TODO
    },

    operation: (res, req) => {
      // TODO
    },

    add: (res, req) => {
      // TODO
    },

    substract: (res, req) => {
      // TODO
    }

  };

  function zrangeNext(index, array, resolve, reject){

  }

  function zrange(){

  }

  return self;

};
