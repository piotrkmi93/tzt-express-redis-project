module.exports = (app, client, helpers) => {

  let self = {

    index: (req, res) => {
      client.keys("kh_*", (err, keys) => hgetallNext(
        0,
        keys,
        array => res.render("hashes/index", {
          title: "Tablice asocjacyjne",
          hashes: array
            .sort(helpers.sortByTime)
            .map(helpers.humanTime)
            .map(helpers.withoutPrefix)
        }),
        key => helpers.throwError(res, `Nie znaleziono klucza "${key}"`)
      ));
    },

    create: (req, res) => {
      res.render("hashes/form", {
        title: "Tworzenie nowej tablicy asocjacyjnej",
        kh: {
          key: "",
          size: req.query.size || 0,
          fields: [],
          values: [],
          time: -1
        }
      });
    },

    update: (req, res) => {
      hgetall(
        req.params && "kh_"+req.params.key || undefined,
        kh => {
          kh.updating = true;
          res.render("hashes/form", {
            kh: helpers.withoutPrefix(kh),
            title: `Edycja zbioru posortowanego ${kh.key}`
          });
        },
        key => helpers.throwError(res, `Nie znaleziono Klucza "${key}"`)
      );
    },

    save: (req, res) => {
      let key     = req.body.key,
          old_key = req.body.old_key,
          time    = Number(req.body.time),
          fields  = req.body.fields,
          values  = req.body.values;


      if(typeof key !== "string" || !key.length)
        helpers.throwError(res, "Podano nieprawidłowy Klucz");
      else if(typeof time !== "number" || time < -1)
        helpers.throwError(res, "Podano nieprawidłowy czas");
      else if(typeof values === "undefined" || !values.length)
        helpers.throwError(res, "Podano nieprawidłowe wartości");
      else if(typeof fields === "undefined" || !fields.length)
        helpers.throwError(res, "Podano nieprawidłowe wagi");
      else if(values.length !== fields.length)
        helpers.throwError(res, "Ilości wartości oraz wag nie są takie same");
      else {
        key = (~key.indexOf("kh_")) ? key : "kh_" + key;
        old_key = (!!old_key ? ((~old_key.indexOf("kh_")) ? old_key : "kh_" + old_key) : undefined);
        if(typeof old_key !== "undefined"){
          client.del(old_key, (err, status) => {
            if(!err && typeof status !== "undefined"){
              self.save({
                body: {
                  key: key,
                  time: time,
                  values: values,
                  fields: fields
                }
              }, res);
            } else
              helpers.throwError(res, `Nie udało się zaktualizować klucza "${req.params.key}"`)
          })
        } else {
          hmset(
            key,
            0,
            values,
            fields,
            () => {
              if(time > -1){
                helpers.expire(key, time, () => res.redirect("/hashes"), res);
              } else res.redirect("/hashes");
            },
            index => helpers.throwError(res, `Nie udało się zapisać wartości ${index}.`)
          )
        }
      }
    },

    add: (req, res) => {
      let key   = req.body.key,
          field = req.body.field,
          value = req.body.value;
      if(typeof key !== "string" || !key.length)
        helpers.throwError(res, "Podano nieprawidłowy klucz");
      else if(typeof field !== "string" || !field.length)
        helpers.throwError(res, "Podano nieprawidłową nazwę pola");
      if(typeof value !== "string" || !key.length)
        helpers.throwError(res, "Podano nieprawidłową wartość");
      else {
        hmset(
          "kh_" + key,
          0,
          [value],
          [field],
          () =>  res.redirect("/hashes/update/"+key),
          index => helpers.throwError(res, `Nie udało się zapisać wartości ${index}.`)
        )
      }
    },

    substract: (req, res) => {
      let key = req.params.key,
          field = req.params.field;
      hdel(
        "kh_"+key,
        field,
        () => res.redirect(`/hashes/update/${req.params.key}`),
        () => helpers.throwError(res, "Nie udało się usunąć elementu")
      )
    },

    delete: (req, res) => {
      client.del(
        "kh_"+req.params.key,
        (err, status) => {
          if(err) helpers.throwError(res, "Nie udało się usunąć tablicy asocjacyjnej");
          else res.redirect("/hashes/")
        });
    }

  };

  function hdel(key, field, resolve, reject){
    client.hdel(
      key, field,
      (err, status) => {
        if(status) resolve();
        else reject();
      }
    );
  }

  function hmset(key, index, values, fields, resolve, reject, array=[]){
    if(typeof values[index] !== "undefined" && typeof fields[index] !== "undefined"){
      client.hmset(
        key,
        fields[index],
        values[index],
        (err, status) => {
          if(status){
            array.push({
              field: fields[index],
              value: values[index]
            });
            hmset(key, index+1, values, fields, resolve, reject, array);
          } else reject(values[index]);
        }
      );
    } else resolve(array);
  }

  function hgetallNext(index, array, resolve, reject){
    if(typeof array[index] !== "undefined"){
      hgetall(
        array[index],
        kh => {
          array[index] = kh;
          hgetallNext(index+1, array, resolve, reject);
        },
        reject
      )
    } else resolve(array);
  }

  function hgetall(key, resolve, reject){
    client.hgetall(key, (err, items) => {
      if(items) {
        items = helpers.objectToArray(items, "field", "value");
        helpers.findTimeLeft({
          key: key,
          items: items,
          size: items.length
        }, resolve);
      } else reject(key);
    })
  }

  return self;

};
