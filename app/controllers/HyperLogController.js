module.exports = (app, client, helpers) => {

  let self = {

    index: (req, res) => {
      client.keys("khl_*", (err, keys) => {
        pfcountNext(
          0,
          keys,
          array => res.render("hyperlogs/index", {
            title: "HyperLogLogs",
            hyperlogs: array.map(helpers.withoutPrefix)
          }),
          key => helpers.throwError(res, `Nie znaleziono klucza "${key}"`)
        )
      });
    },

    create: (req, res) => {
      res.render("hyperlogs/form", {
        title: "Tworzenie nowego HyperLogLoga",
        khl: {
          key: "",
          size: req.query.size || 0,
          items: []
        }
      });
    },

    save: (req, res) => {
      let key = req.body.key,
          items = req.body.items;

      if(typeof key !== "string" || !key.length)
        helpers.throwError(res, "Podano nieprawidłowy klucz");
      else if(typeof items === "undefined" || !items.length)
        helpers.throwError(res, "Podano nieprawidłowe wartości");
      else {
        key = (~key.indexOf("khl_")) ? key : "khl_" + key;
        pfadd(
          key,
          0,
          items,
          () => res.redirect("/hyperlogs"),
          index => helpers.throwError(res, `Nie udało się zapisać wartości ${index}.`)
        )
      }
    },

    merge: (req, res) => {
      let source1 = req.body.source1,
          source2 = req.body.source2,
          target  = req.body.target;

      if(typeof source1 !== "string" || !source1.length)
        helpers.throwError(res, "Podano nieprawidłowy pierwszy klucz");
      else if(typeof source2 !== "string" || !source2.length)
        helpers.throwError(res, "Podano nieprawidłowy drugi klucz");
      else if(typeof target !== "string" || !target.length)
        helpers.throwError(res, "Podano nieprawidłową nazwę nowego klucza");
      else {
        pfmerge(
          "khl_"+target,
          "khl_"+source1,
          "khl_"+source2,
          () => res.redirect("/hyperlogs/"),
          () => helpers.throwError(res, "Nie udało się zmerdżować HyperLogLogów")
        )
      }
    },

    delete: (req, res) => {
      client.del(
        "khl_"+req.params.key,
        (err, status) => {
        if(err) helpers.throwError(res, "Nie udało się usunąć HyperLogLoga");
        else res.redirect("/hyperlogs/")
      });
    }

  };

  function pfcountNext(index, keys, resolve, reject, array=[]){
    if(typeof keys[index] !== "undefined") {
      pfcount(
        keys[index],
        size => {
          array.push({
            key: keys[index],
            size: size
          });
          pfcountNext(index+1, keys, resolve, reject, array);
        },
        reject
      );
    } else resolve(array);
  }

  function pfcount(key, resolve, reject){
    client.pfcount(key, (err, count) => {
      if(typeof count !== "undefined") resolve(count);
      else reject(key);
    });
  }

  function pfadd(key, index, array, resolve, reject){
    if(typeof array[index] !== "undefined"){
      client.pfadd(key, array[index], (err, status) => {
        if(status)
          pfadd(key, index+1, array, resolve, reject);
        else
          reject(index);
      });
    } else resolve();
  }

  function pfmerge(target, source1, source2, resolve, reject){
    client.pfmerge(target, source1, source2, (err, status) => {
      if(status) resolve();
      else reject();
    });
  }

  return self;

};
