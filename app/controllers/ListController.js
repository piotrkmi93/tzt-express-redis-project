module.exports = (app, client, helpers) => {

  return {

    /**
     * Odpowiada za wyświetlenie listy list.
     *
     * @param  {Object} req
     * @param  {Object} res
     */
    index: (req, res) => {
      client.keys("kl_*", (err, keys) => rangeNext(
        0,
        keys,
        array => res.render("lists/index", {
          title: "Listy",
          lists: array
            .sort(helpers.sortByTime)
            .map(helpers.humanTime)
            .map(helpers.withoutPrefix)
        }),
        key => helpers.throwError(res, `Nie znaleziono klucza "${key}"`)
      ));
    },

    /**
     * Zwraca formularz tworzenia nowej listy,
     * jeżeli metoda nie otrzyma liczby elementów w liście
     * to wyświeli się jedynie pole do jej wpisanie i przycisk "Dalej".
     * Ten przeniesie do formularza, gdzie podać można nazwę, czas życia
     * oraz uzupełnić pola wartości kolejnych elementów listy,
     * których będzie tyle ile podano poprzednio.
     *
     * @param  {Object} req
     * @param  {Object} res
     */
    create: (req, res) => {
      res.render("lists/form", {
        title: "Tworzenie nowej listy",
        kl: {
          key: "",
          size: req.query.size || 0,
          items: [],
          time: -1
        },
        items: []
      });
    },

    /**
     * Zwraca formularz edycji listy,
     * obiekt req musi posiadać parametr key,
     * jeśli go nie posiada, zostaje wyrzucony błąd.
     * Forumarz dodaje możliwosć dodawania kolejnych elementów do listy
     * oraz ich usuwania.
     *
     * @param  {Object} req
     * @param  {Object} res
     */
    update: (req, res) => {
      range(
        req.params && "kl_"+req.params.key || undefined,
        kl => {
            kl.updating = true;
            res.render("lists/form", {
            kl: helpers.withoutPrefix(kl),
            title: `Edycja listy "${kl.key}"`
          })
        },
        key => helpers.throwError(res, `Nie znaleziono klucza "${key}"`)
      );
    },

    /**
     * Funkcja odpowiada za dodanie nowego elementu do listy,
     * w zależności od wybranej opcji, na początek lub na koniec.
     *
     * @param {Object} req [description]
     * @param {Object} res [description]
     */
    add: (req, res) => {
      let key = req.body.key,
          item = req.body.item,
          action = req.body.push;
      if(typeof key !== "string" || !key.length)
        helpers.throwError(res, "Podano nieprawidłowy klucz");
      else if(typeof item !== "string" || !item.length)
        helpers.throwError(res, "Podano nieprawidłową wartość");
      else if(typeof action !== "string" || !action.length || (action !== "lpush" && action !== "rpush"))
        helpers.throwError(res, "Podano nieprawidłową akcję");
      else {
        push(
          action,
          "kl_"+key,
          0,
          [item],
          () =>  res.redirect("/lists/update/"+key),
          index => helpers.throwError(res, `Nie udało się zapisać wartości ${index}.`)
        )
      }
    },

    /**
     * Funkcja usuwa element z listy, należy podać klucz listy oraz wartość elementu do usunięcia.
     * Specyfika redisa sprawa niestety, że usunięte zostaną wszystkie elementy o takiej wartości
     * (lub pierwsz / ostatni znaleziony, ja dałem na wszystkie w liście),
     * nie ma możliwości usunięcia konkretnego indeksu.
     *
     * @param  {Object} req
     * @param  {Object} res
     */
    substract: (req, res) => {
      let key = req.params.key,
          item = req.params.item;
      lrem(
        "kl_" + key,
        item,
        () => res.redirect(`/lists/update/${req.params.key}`),
        () => helpers.throwError(res, "Nie udało się usunąć elementu")
      );
    },

    /**
     * Funkcja usuwa listę o podanym kluczu.
     *
     * @param  {Object} req
     * @param  {Object} res
     */
    delete: (req, res) => {
      client.del(
        "kl_"+req.params.key,
        (err, status) => {
        if(err) helpers.throwError(res, "Nie udało się usunąć listy");
        else res.redirect("/lists/")
      });
    },

    /**
     * Metoda zapisująca nową listę.
     * Na początek sprawdzane są wszystkie wymagane pola,
     * jeśli, którakolwiek z wartości jest nieodpowiednia,
     * uzytkownik zostanie przeniesiony na stronę z opisem błędu.
     * Jeśli wszystko się zgadza, wywołana zostaje funkcja push,
     * która zapisuje po kolei wszystkie wartości listy.
     * Jeśli wszystko się uda, użytkownik wraca na listę list.
     *
     * @param  {Object} req
     * @param  {Object} res
     */
    save: (req, res) => {
      let key = req.body.key,
          time = Number(req.body.time),
          items = req.body.items;
      if(typeof key !== "string" || !key.length)
        helpers.throwError(res, "Podano nieprawidłowy klucz");
      else if(typeof time !== "number" || time < -1)
        helpers.throwError(res, "Podano nieprawidłowy czas");
      else if(typeof items === "undefined" || !items.length)
        helpers.throwError(res, "Podano nieprawidłowe wartości");
      else {
        push(
          "rpush",
          "kl_"+key,
          0,
          items,
          () =>  res.redirect("/lists"),
          index => helpers.throwError(res, `Nie udało się zapisać wartości ${index}.`)
        )
      }
    }
  };

  /**
   * Funkcja ta ma za zadanie dodać elementy
   * do listy o kluczu key i powtarzać się tak długo,
   * aż nie skończą się elementy w tablicy array.
   *
   * @param  {String} action    lpush lub rpush
   * @param  {String} key       nazwa klucza
   * @param  {Number} index     pozycja iteratora
   * @param  {Array} array      tablica wartości
   * @param  {Function} resolve funkcja udanego procesu
   * @param  {Function} reject  funkcja nieudanego procesu
   */
  function push(action, key, index, array, resolve, reject){
    if(typeof array[index] !== "undefined"){
      client[action](
        key,
        array[index],
        (err, status) => {
          if(status)
            push(action, key, index+1, array, resolve, reject);
          else
            reject(index)
        }
      )
    } else resolve();
  }

  /**
   * Funkcja ta wyszukuje listy o podanych kluczach w array.
   * Wykonuje się dopóki tablica ta posiada elementy.
   *
   * @param  {Number} index
   * @param  {Array} array
   * @param  {Function} resolve
   * @param  {Function} reject
   */
  function rangeNext(index, array, resolve, reject){
    if(typeof array[index] !== "undefined"){
      range(
        array[index],
        kl => {
          array[index] = kl;
          rangeNext(index+1, array, resolve, reject);
        },
        reject
      );
    } else resolve(array);
  }

  /**
   * Funkcja ma za zadanie pobranie elementów listy o kluczu key.
   * Jako trzeci i czwarty element można podać indeksy
   * początku i końca.
   *
   * @param  {String} key
   * @param  {Function} resolve
   * @param  {Function} reject
   * @param  {Number} [start=0]
   * @param  {Number} [end=-1]
   */
  function range(key, resolve, reject, start=0, end=-1){
    client.lrange(
      key,
      start,
      end,
      (err, items) => {
        if(items && items.length) findTimeLeft({ key: key, items: items, size: items.length }, resolve);
        else reject(key);
      }
    );
  }

  /**
   * Funkcja dodaje do obiektu kl property time,
   * który oznacza ile czasu będzie jeszcze żył ten obiekt.
   * -1 oznacza wieczność.
   *
   * @param  {Object} kl
   * @param  {Function} resolve
   */
  function findTimeLeft(kl, resolve){
    client.ttl(kl.key, (err, time) => {
      kl.time = time;
      resolve(kl);
    });
  }

  /**
   * Funkcja usuwa pojedynczy element z listy
   *
   * @param  {String} key
   * @param  {Function} resolve
   * @param  {Function} reject
   * @param  {Number} start
   * @param  {Number} [len=1]
   */
  function lrem(key, item, resolve, reject){
    client.lrem(key, 0, item, (err, status) => {
      console.log(status);
      console.log(err);
      if(typeof status) resolve();
      else reject();
    });
  }


};
