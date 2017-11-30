module.exports = (app, client, helpers) => {

  let self = {

    index: (req, res) => {
      client.keys("kss_*", (err, keys) => zrangeNext(
        0,
        keys,
        array => res.render("sorted_sets/index", {
          title: "Zbiory posortowane",
          sorted_sets: array
            .sort(helpers.sortByTime)
            .map(helpers.humanTime)
            .map(helpers.withoutPrefix)
        }),
        key => helpers.throwError(res, `Nie znaleziono klucza "${key}"`)
      ));
    },

    create: (req, res) => {
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

    update: (req, res) => {
      zrange(
        req.params && "kss_"+req.params.key || undefined,
        kss => {
          kss.updating = true;
          res.render("sorted_sets/form", {
            kss: helpers.withoutPrefix(kss),
            title: `Edycja zbioru posortowanego ${kss.key}`
          });
        },
        key => helpers.throwError(res, `Nie znaleziono Klucza "${key}"`)
      );
    },

    save: (req, res) => {
      let key     = req.body.key,
          old_key = req.body.old_key,
          time    = Number(req.body.time),
          values  = req.body.values,
          scores  = req.body.scores;

      if(typeof key !== "string" || !key.length)
        helpers.throwError(res, "Podano nieprawidłowy Klucz");
      else if(typeof time !== "number" || time < -1)
        helpers.throwError(res, "Podano nieprawidłowy czas");
      else if(typeof values === "undefined" || !values.length)
        helpers.throwError(res, "Podano nieprawidłowe wartości");
      else if(typeof scores === "undefined" || !scores.length)
        helpers.throwError(res, "Podano nieprawidłowe wagi");
      else if(values.length !== scores.length)
        helpers.throwError(res, "Ilości wartości oraz wag nie są takie same");
      else {
        key = (~key.indexOf("kss_")) ? key : "kss_" + key;
        old_key = (!!old_key ? ((~old_key.indexOf("kss_")) ? old_key : "kss_" + old_key) : undefined);

        if(typeof old_key !== "undefined"){
          client.del(old_key, (err, status) => {
            if(!err && typeof status !== "undefined"){
              self.save({
                body: {
                  key: key,
                  time: time,
                  values: values,
                  scores: scores
                }
              }, res);
            } else
              helpers.throwError(res, `Nie udało się zaktualizować klucza "${req.params.key}"`)
          });
        } else {
          zadd(
            key,
            0,
            values,
            scores,
            () => {
              if(time > -1){
                helpers.expire(key, time, () => res.redirect("/sorted_sets"), res);
              } else res.redirect("/sorted_sets");
            },
            index => helpers.throwError(res, `Nie udało się zapisać wartości ${index}.`)
          )
        }

      }
    },

    delete: (req, res) => {
      client.del(
        "kss_"+req.params.key,
        (err, status) => {
          if(err) helpers.throwError(res, "Nie udało się usunąć zbioru posortowanego");
          else res.redirect("/sorted_sets/")
        });
    },

    operation: (req, res) => {
      let operation = req.body.operation,
          source1   = req.body.source1,
          source2   = req.body.source2,
          key       = req.body.key;


      if(typeof operation !== "string" || !operation.length || !~["zinterstore", "zunionstore"].indexOf(operation))
        helpers.throwError(res, `Błędna operacja ${operation}.`);
      else if(typeof source1 !== "string" || !source1.length)
        helpers.throwError(res, `Nieprawidłowy pierwszy zbiór.`);
      else if(typeof source2 !== "string" || !source2.length)
        helpers.throwError(res, `Nieprawidłowy drugi zbiór.`);
      else if(typeof key !== "string" || !key.length)
        helpers.throwError(res, `Nieprawidłowa (lub brak) nazwa nowego zbioru.`);
      else {
        client[operation](
          "kss_" + key,
          String(2),
          "kss_" + source1,
          "kss_" + source2,
          (err, status) => {
            if(status)
              res.redirect("/sorted_sets/update/"+key)
            else
              helpers.throwError(res, "Nie udało się wykonać operacji.");
          }
        );
      }
    },

    add: (req, res) => {
      let key   = req.body.key,
          score = Number(req.body.score),
          value = req.body.value;
      if(typeof key !== "string" || !key.length)
        helpers.throwError(res, "Podano nieprawidłowy klucz");
      else if(typeof score !== "number" || !score)
        helpers.throwError(res, "Podano nieprawidłową wagę");
      if(typeof value !== "string" || !key.length)
        helpers.throwError(res, "Podano nieprawidłową wartość");
      else {
        zadd(
          "kss_"+key,
          0,
          [value],
          [score],
          () =>  res.redirect("/sorted_sets/update/"+key),
          index => helpers.throwError(res, `Nie udało się zapisać wartości ${index}.`)
        );
      }
    },

    substract: (req, res) => {
      let key = req.params.key,
          value = req.params.value;
      zrem(
        "kss_" + key,
        value,
        () => res.redirect(`/sorted_sets/update/${req.params.key}`),
        () => helpers.throwError(res, "Nie udało się usunąć elementu")
      )
    }

  };

  function zadd(key, index, values, scores, resolve, reject, array = []){
    if(typeof values[index] !== "undefined" && typeof scores[index] !== "undefined"){
      client.zadd(
        key,
        scores[index],
        values[index],
        (err, status) => {
          if(status){
            array.push({
              score: scores[index],
              value: values[index]
            });
            zadd(key, index+1, values, scores, resolve, reject, array);
          } else reject(values[index]);
        }
      )
    } else resolve(array);
  }

  function zrem(key, value, resolve, reject){
    client.zrem(
      key, value,
      (err, status) => {
        if(status) resolve();
        else reject();
      }
    )
  }

  function zrangeNext(index, array, resolve, reject){
    if(typeof array[index] !== "undefined"){
      zrange(
        array[index],
        kss => {
          array[index] = kss;
          zrangeNext(index+1, array, resolve, reject);
        },
        reject
      )
    } else resolve(array);
  }

  function zrange(key, resolve, reject, withscores = false, start = 0, end = -1){
    client.zrange(key, start, end, "WITHSCORES", (err, items) => {
      if(items && items.length) {
        items = helpers.optimizeItems(items, "score", "value");
        helpers.findTimeLeft({
          key: key,
          items: items,
          size: items.length
        }, resolve);
      } else reject(key);
    });
  }


  return self;

};
