module.exports = (app, client, helpers) => {

  return {

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
        })
      ));
    },

    create: (req, res) => {

    },

    update: (req, res) => {

    },

    // todo

  };

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
      kl.time = time;
      resolve(kl);
    });
  }

};
