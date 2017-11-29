module.exports = (app, client, helpers) => {

  let self = {

    index: (req, res) => {
      client.keys("ks_*", (err, keys) => smembersNext(
        0,
        keys,
        array => res.render("sets/index", {
          title: "Zbiory",
          sets: array
            .sort(helpers.sortByTime)
            .map(helpers.humanTime)
            .map(helpers.withoutPrefix)
        }),
        key => helpers.throwError(res, `Nie znaleziono klucza "${key}"`)
      ));
    },

    create: (req, res) => {
      res.render("sets/form", {
        title: "Tworzenie nowego zbioru",
        ks: {
          key: "",
          size: req.query.size || 0,
          items: [],
          time: -1
        }
      })
    },

    update: (req, res) => {
      smembers(
        req.params && "ks_"+req.params.key || undefined,
        ks => {
          ks.updating = true;
          res.render("sets/form", {
            ks: helpers.withoutPrefix(ks),
            title: `Edycja zbioru "${ks.key}"`
          });
        },
        key => helpers.throwError(res, `Nie znaleziono ksucza "${key}"`)
      );
    },

    add: (req, res) => {
      let key = req.body.key,
          item = req.body.item;
      if(typeof key !== "string" || !key.length)
        helpers.throwError(res, "Podano nieprawidłowy klucz");
      else if(typeof item !== "string" || !item.length)
        helpers.throwError(res, "Podano nieprawidłową wartość");
      else {
        sadd(
          "ks_" + key,
          0,
          [item],
          () =>  res.redirect("/sets/update/"+key),
          index => helpers.throwError(res, `Nie udało się zapisać wartości ${index}.`)
        )
      }
    },

    substract: (req, res) => {
      let key = req.params.key,
          item = req.params.item;
      srem(
        "ks_"+key,
        item,
        () => res.redirect(`/sets/update/${req.params.key}`),
        () => helpers.throwError(res, "Nie udało się usunąć elementu")
      )
    },

    save: (req, res) => {
      let key = req.body.key,
          old_key = req.body.old_key,
          time = Number(req.body.time),
          items = req.body.items;
          if(typeof key !== "string" || !key.length)
            helpers.throwError(res, "Podano nieprawidłowy ksucz");
          else if(typeof time !== "number" || time < -1)
            helpers.throwError(res, "Podano nieprawidłowy czas");
          else if(typeof items === "undefined" || !items.length)
            helpers.throwError(res, "Podano nieprawidłowe wartości");
          else {
            key = (~key.indexOf("ks_")) ? key : "ks_" + key;
            old_key = (!!old_key ? ((~old_key.indexOf("ks_")) ? old_key : "ks_" + old_key) : undefined);
            if(typeof old_key !== "undefined" && old_key !== key){
              client.del(old_key, (err, status) => {
                if(!err && typeof status !== "undefined"){
                  self.save({
                    body: {
                      key: key,
                      time: time,
                      items: items
                    }
                  }, res);
                } else
                  helpers.throwError(res, `Nie udało się zaktualizować klucza "${req.params.key}"`)
              });
            } else {
              sadd(
                key,
                0,
                items,
                () => res.redirect("/sets"),
                index => helpers.throwError(res, `Nie udało się zapisać wartości ${index}.`)
              );
            }
          }
    },

    delete: (req, res) => {
      client.del(
        "ks_"+req.params.key,
        (err, status) => {
          if(err) helpers.throwError(res, "Nie udało się usunąć listy");
          else res.redirect("/sets/")
        });
    },

    operation: (req, res) => {

      let operation = req.body.operation,
          source1   = req.body.source1,
          source2   = req.body.source2,
          key       = req.body.key;

      if(typeof operation !== "string" || !operation.length || !~["sdiffstore", "sinterstore", "sunionstore"].indexOf(operation))
        helpers.throwError(res, `Błędna operacja ${operation}.`);
      else if(typeof source1 !== "string" || !source1.length)
        helpers.throwError(res, `Nieprawidłowy pierwszy zbiór.`);
      else if(typeof source2 !== "string" || !source2.length)
        helpers.throwError(res, `Nieprawidłowy drugi zbiór.`);
      else if(typeof key !== "string" || !key.length)
        helpers.throwError(res, `Nieprawidłowa (lub brak) nazwa nowego zbioru.`);
      else {

        client[operation](
          "ks_" + key,
          "ks_" + source1,
          "ks_" + source2,
          (err, status) => {
            console.log(err);
            console.log(status);

            if(typeof status !== "undefined")
              res.redirect("/sets/update/"+key)
            else
              helpers.throwError(res, "Nie udało się wykonać operacji.");
          }
        );

      }
    }

  };

  function srem(key, item, resolve, reject){
    client.srem(
      key, item,
      (err, status) => {
        console.log(status);
        if(status) resolve();
        else reject();
      }
    )
  }

  function sadd(key, index, array, resolve, reject){
    if(typeof array[index] !== "undefined"){
      client.sadd(
        key,
        array[index],
        (err, status) => {
          if(status)
            sadd(key, index+1, array, resolve, reject);
          else
            reject(array[index]);
        }
      );
    } else resolve();
  }

  function smembersNext(index, array, resolve, reject){
    if(typeof array[index] !== "undefined"){
      smembers(
        array[index],
        ks => {
          array[index] = ks;
          smembersNext(index+1, array, resolve, reject);
        },
        reject
      )
    } else resolve(array);
  }

  function smembers(key, resolve, reject){
    client.smembers(key, (err, items) => {
      if(items && items.length) findTimeLeft({
          key: key,
          items: items,
          size: items.length
        }, resolve);
      else reject(key);
    });
  }

  function findTimeLeft(ks, resolve){
    client.ttl(ks.key, (err, time) => {
      ks.time = time;
      resolve(ks);
    });
  }


  return self;
};
