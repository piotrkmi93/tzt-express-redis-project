module.exports = (app, client, helpers) => {

  let self = {

    index: (req, res) => {
      client.keys("kb_*", (err, keys) => getAllBitsNext(
        0,
        keys,
        array => res.render("bitmaps/index", {
          title: "Bitmapy",
          bitmaps: array
            .map(helpers.withoutPrefix)
        }),
        key => helpers.throwError(res, `Nie znaleziono bitu "${key}"`)
      ));
    },

    create: (req, res) => {
      res.render("bitmaps/form", {
        title: "Tworzenie nowej bitmapy",
        kb: {
          key: "",
          bits: ""
        }
      });
    },

    update: (req, res) => {
      getAllBitsNext(
        0,
        [req.params && "kb_"+req.params.key || undefined],
        array => res.render("bitmaps/form", {
            kb: array[0],
            title: `Edycja bitmapy ${req.params.key}`
          }),
        key => helpers.throwError(res, `Nie znaleziono Klucza "${key}"`)
      );
    },

    save: (req, res) => {
      let key     = req.body.key,
          old_key = req.body.old_key,
          bits    = req.body.bits;

      if(typeof key !== "string" || !key.length)
        helpers.throwError(res, "Podano nieprawidłowy Klucz");
      else if(typeof bits !== "string" || !bits.length)
        helpers.throwError(res, "Podano nieprawidłowy ciąg bitów");
      else {
        key = (~key.indexOf("kb_")) ? key : "kb_" + key;
        old_key = (!!old_key ? ((~old_key.indexOf("kb_")) ? old_key : "kb_" + old_key) : undefined);
        if(typeof old_key !== "undefined" && key !== old_key){
          client.del(old_key, (err, status) => {
            if(!err && typeof status !== "undefined"){
              self.save({
                body: {
                  key: key,
                  bits: bits
                }
              }, res);
            } else helpers.throwError(res, `Nie udało się zaktualizować klucza "${req.params.key}"`);
          });
        } else {
          setAllBits(
            key,
            0,
            bits.split("").reverse(),
            () => res.redirect("/bitmaps"),
            () => helpers.throwError(res, `Nie udało się zapisać bitmapy ${key}.`)
          )
        }
      }
    },

    delete: (req, res) => {
      client.del(
        "kb_"+req.params.key,
        (err, status) => {
          if(err) helpers.throwError(res, "Nie udało się usunąć bitmapy");
          else res.redirect("/bitmaps/")
        });
    }


  };

  function getAllBitsNext(index, keys, resolve, reject, array=[]){
    if(typeof keys[index] !== "undefined"){
      getAllBits(
        keys[index],
        0,
        bits => {
          array.push({
            key: keys[index],
            bits: ((bits) => {
              bits = bits.reverse().join("");
              return bits.slice(bits.indexOf("1"));
            })(bits),
            value: helpers.bitToInt(bits.reverse())
          });
          getAllBitsNext(index+1, keys, resolve, reject, array);
        },
        reject
      )
    } else resolve(array);
  }

  function getAllBits(key, index, resolve, reject, bits=[]){
    if(index < 32){
      getBit(
        key,
        index,
        bit => {
          bits.push(bit);
          getAllBits(key, index+1, resolve, reject, bits);
        },
        reject
      )
    } else resolve(bits);
  }

  function setAllBits(key, index, bits, resolve, reject){
    if(typeof bits[index] !== "undefined"){
      setBit(
        key,
        index,
        bits[index],
        () => setAllBits(key, index+1, bits, resolve, reject),
        reject
      )
    } else resolve();
  }

  function getBit(key, offset, resolve, reject){
    client.getbit(key, offset, (err, bit) => {
      if(typeof bit !== "undefined") resolve(bit);
      else reject();
    })
  }

  function setBit(key, offset, bit, resolve, reject){
    client.setbit(key, offset, bit, (err, status) => {
      if(typeof status !== "undefined") resolve();
      else reject();
    })
  }

  return self;

};
