module.exports = (app, client) => {

  const prefixes = [
    "kv_",  // strings
    "kl_",  // lists
    "ks_",  // sets
    "kss_", // sorted sets
    "kh_",  // hashes
    "kb_",  // bitmaps
    "khl_"  // hyperlogs
  ];

  let self = {

    /**
     * Funkcja do sortowania elementów
     * od najkrócej żyjącego do najdłużej.
     * Jeśli element nigdy nie umrze to jest wstawiany na koniec.
     *
     * @param  {Object} a
     * @param  {Object} b
     */
    sortByTime: (a, b) => {
      if(a.time === -1) return 1;
      if(b.time === -1) return -1;
      return a.time > b.time
    },

    /**
     * Funckja przekształca czas w sekundach na format
     * tygodnie, dni, godziny, minuty, sekundy
     *
     * @param  {Object} obj
     */
    humanTime: obj => {
      if(obj && obj.time){
        if(obj.time === -1)
          obj.time = "Nigdy";
        else {
          let seconds = obj.time;
          let minutes = Math.floor(seconds / 60);
          seconds = seconds - (minutes * 60);
          let hours = Math.floor(minutes / 60);
          minutes = minutes - (hours * 60);
          let days = Math.floor(hours / 24);
          hours = hours - (days * 24);
          let weeks = Math.floor(days / 7);
          days = days - (weeks * 7);
          obj.time = "";
          if(weeks) obj.time += weeks+"w ";
          if(days) obj.time += days+"d ";
          if(hours) obj.time += hours+"h ";
          if(minutes) obj.time += minutes+"m ";
          if(seconds) obj.time += seconds+"s";
        }
      }
      return obj;
    },

    /**
     * Funckja usuwa prefix z klucza
     *
     * @param  {Object} obj
     */
    withoutPrefix: obj => {
      if(obj && obj.key){
        obj.key = String(obj.key);
        for(prefix of prefixes){
          if(!obj.key.indexOf(prefix)){
            obj.key = obj.key.slice(prefix.length);
            return obj;
          }
        }
      }
    },

    /**
     * Ustawia w obiekcie wartość calculatable,
     * jeśli wartość klucza jest numeryczna,
     * można ją wówczas inkrementować i dekrementować
     *
     * @param {Object} obj
     */
    setCalculatable: obj => {
      if(obj && obj.value)
        obj.calculatable = !!Number(obj.value);
      return obj;
    },

    /**
     * Przenosi użytkownika na stronę błędu i wyświetla wiadomość
     *
     * @param  {Objecy} res
     * @param  {String} message
     */
    throwError: (res, message) => {
      res.render("error", {
        message: message
      });
    },

    /**
     * Funkcja przydatna do sorted_sets,
     * tworzy tablicę obiektów z wartościami i wagami
     *
     * @param  {Array} items
     */
    optimizeItems: (items, left, right) => {
      let ret = [];
      for(let i=0; i<items.length; ++i){
        if(i%2) ret[ret.length-1][left] = items[i];
        else {
          ret.push({});
          ret[ret.length-1][right] = items[i];
        }
      }
      return ret;
    },

    objectToArray: (items, left, right) => {
      let ret = []
      for(let key in items) {
        ret.push({});
        ret[ret.length-1][left] = key;
        ret[ret.length-1][right] = items[key];
      }
      return ret;
    },

    findTimeLeft: (obj, resolve) => {
      client.ttl(obj.key, (err, time) => {
        obj.time = time;
        resolve(obj);
      });
    },

    expire: (key, time, resolve, res) => {
      client.expire(key, time, (err, status) => {
        if(status) resolve();
        else self.throwError(res, `Nie udało się ustawić czasu dla klucza ${key}`);
      })
    },

    bitToInt: (bits) => {
      let val = 0;
      for(let i=bits.length-1; i>=0; --i){
        val += Number(bits[i]) * Math.pow(2, i);
      }
      return val;
    }

  };

  return self;

};
