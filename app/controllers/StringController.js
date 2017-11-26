module.exports = (app, client, helpers) => {

    // public functions

    return {

        index: (req, res) => {
          client.keys("kv_*", (err, keys) => findNext(
            0,
            keys,
            keys => res.render("strings/index", {
                title: "Ciągi znaków",
                keys: keys
                  .sort(helpers.sortByTime)
                  .map(helpers.humanTime)
                  .map(helpers.withoutPrefix)
                  .map(helpers.setCalculatable)
            }),
            key => helpers.throwError(res, `Nie znaleziono klucza "${key}"`)
          ));
        },

        create: (req, res) => {
          res.render("strings/form", {
            kv: {
              key: undefined,
              value: undefined,
              time: -1
            },
            title: "Ciągi znaków - formularz tworzenia nowego klucza"
          })
        },

        update: (req, res) => {
          find(
            req.params && "kv_"+req.params.key || undefined,
            kv => res.render("strings/form", {
              kv: helpers.withoutPrefix(kv),
              title: `Ciągi znaków - formularz edycji klucza "${kv.key}"`
            }),
            key => helpers.throwError(res, `Nie znaleziono klucza "${key}"`)
          );
        },

        delete: (req, res) => {
          find(
            req.params && "kv_"+req.params.key || undefined,
            kv => client.del(kv.key, (err, status) => {
              if(status === 1) res.redirect("/strings");
              else helpers.throwError(res, `Nie udało się usunąć klucza "${req.params.key}"`)
            }),
            key => helpers.throwError(res, `Nie znaleziono klucza "${key}"`)
          );
        },

        save: (req, res) => {
          let key = req.body.key,
              value = req.body.value,
              time = Number(req.body.time);
          if(typeof key !== "string" || !key.length)
            helpers.throwError(res, "Podano nieprawidłowy klucz");
          else if(typeof value !== "string" || !value.length)
            helpers.throwError(res, "Podano nieprawidłową wartość");
          else if(typeof time !== "number" || time < -1)
            helpers.throwError(res, "Podano nieprawidłowy czas");
          else {
            key = (~key.indexOf("kv_")) ? key : "kv_" + key;
            client.set(key, value, (err, status) => {
              if(status === "OK"){
                if(time > -1)
                  client.expire(key, time, (err, status2) => {
                    if(status === "OK") res.redirect("/strings");
                    else helpers.throwError(res, `Nie udało się ustawić czasu dla klucza`);
                  });
                else res.redirect("/strings");
              } else helpers.throwError(res, `Nie udało się zapisać klucza`);
            });
          }
        },

        increment: (req, res) => {
          find(
            req.params && "kv_"+req.params.key || undefined,
            kv => client.incr(kv.key, (err, status) => {
              console.log(status);
              if(typeof status !== "undefined") res.redirect("/strings");
              else helpers.throwError(res, `Nie udało się inkrementować klucza "${req.params.key}"`)
            }),
            key => helpers.throwError(res, `Nie znaleziono klucza "${key}"`)
          );
        },

        decrement: (req, res) => {
          find(
            req.params && "kv_"+req.params.key || undefined,
            kv => client.decr(kv.key, (err, status) => {
              console.log(status);
              if(typeof status !== "undefined") res.redirect("/strings");
              else helpers.throwError(res, `Nie udało się dekrementować klucza "${req.params.key}"`)
            }),
            key => helpers.throwError(res, `Nie znaleziono klucza "${key}"`)
          );
        }

    };

    // private functions

    function findNext(index, array, resolve, reject){
      if(typeof array[index] !== "undefined"){
        find(
          array[index],
          kv => {
            array[index] = kv;
            findNext(index+1, array, resolve, reject);
          },
          reject
        );
      } else resolve(array);
    }

    function find(key, resolve, reject){
      if(typeof key !== "undefined"){
        client.get(key, (err, value) => {
          if(!!value) findTimeLeft({ key: key, value: value }, resolve);
          else reject(key);
        });
      }
    }

    function findTimeLeft(kv, resolve){
      client.ttl(kv.key, (err, time) => {
        kv.time = time;
        resolve(kv);
      });
    }

};
