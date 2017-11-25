module.exports = (app, client) => {

    // public functions

    return {

        index: (req, res) => {
          client.keys("*", (err, keys) => findNext(
            0,
            keys,
            keys => res.render("strings/index", {
                title: "Ciągi znaków",
                keys: keys
                  .sort((a,b) => {
                    if(a.time === -1) return 1;
                    if(b.time === -1) return -1;
                    return a.time > b.time
                  })
                  .map(k => {
                    if(k.time !== -1){
                      let seconds = k.time;

                      let minutes = Math.floor(seconds / 60);
                      seconds = seconds - (minutes * 60);

                      let hours = Math.floor(minutes / 60);
                      minutes = minutes - (hours * 60);

                      let days = Math.floor(hours / 24);
                      hours = hours - (days * 24);

                      k.time = "";
                      if(days) k.time += days+"d ";
                      if(hours) k.time += hours+"h ";
                      if(minutes) k.time += minutes+"m ";
                      if(seconds) k.time += seconds+"s";
                    } else k.time = "Nigdy"

                    return k;
                  })

            }),
            key => res.render("error", {
              message: `Nie znaleziono klucza "${key}"`
            })
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
            req.params && req.params.key || undefined,
            kv => res.render("strings/form", {
              kv: kv,
              title: `Ciągi znaków - formularz edycji klucza "${kv.key}"`
            }),
            key => res.render("error", {
              message: `Nie znaleziono klucza "${key}"`
            })
          );
        },

        delete: (req, res) => {

          find(
            req.params && req.params.key || undefined,
            kv => client.del(kv.key, (err, status) => {
              if(status === 1) res.redirect("/strings");
              else {
                res.render("error", {
                  message: `Nie udało się usunąć klucza "${req.params.key}"`
                })
              }
            }),
            key => res.render("error", {
              message: `Nie znaleziono klucza "${key}"`
            })
          )

        },

        save: (req, res) => {
          let key = req.body.key,
              value = req.body.value,
              time = Number(req.body.time);

          if(typeof key !== "string" || !key.length)
            res.render("error", {
              message: "Podano nieprawidłowy klucz"
            });
          else if(typeof value !== "string" || !value.length)
            res.render("error", {
              message: "Podano nieprawidłową wartość"
            });
          else if(typeof time !== "number" || time < -1)
            res.render("error", {
              message: "Podano nieprawidłowy czas"
            });
          else
            client.set(key, value, (err, status) => {
              if(status === "OK"){
                if(time > -1)
                  client.expire(key, time, (err, status2) => {
                    if(status === "OK") res.redirect("/strings");
                    else res.render("error", {
                      message: `Nie udało się ustawić czasu dla klucza`
                    });
                  });
                else res.redirect("/strings");
              } else res.render("error", {
                message: `Nie udało się zapisać klucza`
              });
            });
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
