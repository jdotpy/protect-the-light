function toSet(array) {
  return array.reduce(
    (acc, value) => {
      acc[value] = true;
      return acc;
    },
    {}
  );
}

function values(obj) {
  const items = [];
  for (const key of Object.keys(obj)) {
    items.push(obj[key]);
  }
  return items;
}

function keyBy(key, array) {
  return array.reduce(
    (acc, value) => {
      acc[value[key]] = value;
      return acc;
    },
    {}
  );
}

function websocketUrl(path) {
  const loc = window.location;
  const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${loc.host}${path}`
}

function cacher(f) {
  const cache = {};
  return function() {
    const cacheKey = JSON.stringify(arguments);
    if (cache[cacheKey]) {
      return cache[cacheKey];
    }
    const value = f.apply(null, arguments);
    cache[cacheKey] = value;
    return value;
  }
}
