module.exports = (app, client) => {

  return {

    sortByTime: (a, b) => {
      if(a.time === -1) return 1;
      if(b.time === -1) return -1;
      return a.time > b.time
    },

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
          obj.time = "";
          if(days) obj.time += days+"d ";
          if(hours) obj.time += hours+"h ";
          if(minutes) obj.time += minutes+"m ";
          if(seconds) obj.time += seconds+"s";
        }
      }
      return obj;
    },

    withoutPrefix: obj => {
      if(obj && obj.key){
        obj.key = (String(obj.key)).slice(3);
        return obj;
      }
    },

    setCalculatable: obj => {
      if(obj && obj.value)
        obj.calculatable = !!Number(obj.value);
      return obj;
    },

    throwError: (res, message) => {
      res.render("error", {
        message: message
      });
    }

  };

};
