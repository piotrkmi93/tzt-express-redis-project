module.exports = (app, client, helpers) => {

  return {

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

    create: (req, res) => {
      res.render("lists/form", {
        title: "Tworzenie nowej listy",
        kl: {
          key: "",
          items: req.query.items || 0,
          time: -1
        },
        items: []
      });
    },

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
          "lpush",
          "kl_"+key,
          0,
          items,
          () =>  res.redirect("/lists"),
          index => helpers.throwError(res, `Nie udało się zapisać wartości ${index}.`)
        )
      }
    }
  };

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

  function range(key, resolve, reject, start=0, end=-1){
    client.lrange(
      key,
      start,
      end,
      (err, items) => {
        if(items) findTimeLeft({ key: key, items: items, size: items.length }, resolve);
        else reject(key);
      }
    );
  }

  function findTimeLeft(kl, resolve){
    client.ttl(kl.key, (err, time) => {
      kl.time = time;
      resolve(kl);
    });
  }

};
