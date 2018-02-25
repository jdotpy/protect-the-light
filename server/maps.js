function BasicMap() {
  const map = {};

  map.logic = function() {

  }

  map.isDone = function() {
    return false;
  }

  map.results = function() {
    return {
      win: true,
    };
  }

  return map;
}

module.exports = {
  Basic: BasicMap,
};
