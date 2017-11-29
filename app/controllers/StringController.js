module.exports = (app, client, helpers) => {

    let self = {

        /**
         * Funkcja wyświetlająca wszystkie klucze razem z wartościami oraz czasem życia.
         *
         * @param  {Object} req
         * @param  {Object} res
         */
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

        /**
         * Formularz dodawania nowego klucza.
         *
         * @param  {Object} req
         * @param  {Object} res
         */
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

        /**
         * Formularz edycji klucza.
         *
         * @param  {Object} req
         * @param  {Object} res
         */
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

        /**
         * Usuwanie klucza.
         *
         * @param  {Object} req
         * @param  {Object} res
         */
        delete: (req, res) => {
          find(
            req.params && "kv_"+req.params.key || undefined,
            kv => client.del(kv.key, (err, status) => {
              if(typeof status !== "undefined") res.redirect("/strings");
              else helpers.throwError(res, `Nie udało się usunąć klucza "${req.params.key}"`)
            }),
            key => helpers.throwError(res, `Nie znaleziono klucza "${key}"`)
          );
        },

        /**
         * Zapisywanie klucza do bazy.
         * Funkcja najpierw sprawdza przesłane wartości: key, value i time,
         * jeśli któryś z nich jest nieprawidłowy to użytkownik przenoszony
         * jest do strony z błędem.
         *
         * @param  {Object} req
         * @param  {Object} res
         */
        save: (req, res) => {
          let key = req.body.key,
              value = req.body.value,
              time = Number(req.body.time),
              old_key = req.body.old_key;
          if(typeof key !== "string" || !key.length)
            helpers.throwError(res, "Podano nieprawidłowy klucz");
          else if(typeof value !== "string" || !value.length)
            helpers.throwError(res, "Podano nieprawidłową wartość");
          else if(typeof time !== "number" || time < -1)
            helpers.throwError(res, "Podano nieprawidłowy czas");
          else {
            key = (~key.indexOf("kv_")) ? key : "kv_" + key;
            old_key = (!!old_key ? ((~old_key.indexOf("kv_")) ? old_key : "kv_" + old_key) : undefined);
            if(typeof old_key !== "undefined" && old_key !== key){
              client.del(old_key, (err, status) => {
                if(!err && typeof status !== "undefined") {
                  self.save({
                    body: {
                      key: key,
                      value: value,
                      time: time
                    }
                  }, res);
                } else
                  helpers.throwError(res, `Nie udało się zaktualizować klucza "${req.params.key}"`)
              });
            } else {
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
          }
        },

        /**
         * Jeżeli wartość klucza jest numeryczna to można ją inkrementować,
         * ta funkcja odpowiada za wzrost tej wartości o 1.
         *
         * @param  {Object} req
         * @param  {Object} res
         */
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

        /**
         * Jeżeli wartość klucza jest numeryczna to można ją dekrementowac,
         * ta funkcja odpowiada za zmniejszenie tej wartości o 1.
         *
         * @param  {Object} req
         * @param  {Object} res
         */
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

    /**
     * Funkcja wyszukuje rekurencyjnie warości na podstawie kluczy w array.
     * Jeśli skończą się elementy w tej tablicy to wykonywana jest
     * funkcja resolve
     *
     * @param  {Number} index
     * @param  {Array} array
     * @param  {Function} resolve
     * @param  {Function} reject
     */
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

    /**
     * Funkcja wyszukuje wartość na podstawie podanego klucza.
     *
     * @param  {String} key
     * @param  {Function} resolve
     * @param  {Function} reject
     */
    function find(key, resolve, reject){
      if(typeof key !== "undefined"){
        client.get(key, (err, value) => {
          if(!!value) findTimeLeft({ key: key, value: value }, resolve);
          else reject(key);
        });
      }
    }

    /**
     * Funkcja wyszukująca czas życia klucza.
     *
     * @param  {Object} kv
     * @param  {Function} resolve
     */
    function findTimeLeft(kv, resolve){
      client.ttl(kv.key, (err, time) => {
        kv.time = time;
        resolve(kv);
      });
    }

    return self;
};
