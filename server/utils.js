Array.prototype.remove = function(item){
    this.splice(this.indexOf(item), 1);
};

function preciseTime() {
  const timeSections = process.hrtime();
  const seconds = timeSections[0] + timeSections[1] / 1000000000;
  return seconds;
}

function keyBy(items, property) {
  return items.reduce(
    (keyed, item) => {
      const newProperty = {[item[property]]: item };
      return Object.assign(keyed, newProperty);
    },
    {},
  );
}

function Queue() {
  const queue = {
    items: [],
  };

  queue.add = function(item) {
    queue.items.push(item);
  }

  queue.addAll = function(items) {
    queue.items = queue.items.concat(items);
  }

  queue.drain = function() {
    const current = queue.items;
    queue.items = [];
    return current;
  }

  return queue;
}

function normalizeAngle(angle) {
  return (360 + angle) % 360;
}

function angleBetween(angle, start, end) {
  // If we are covering an angle span that wraps around (e.g. 350-10)
  start = normalizeAngle(start);
  end = normalizeAngle(end);
  if (end < start) {
    return angle <= end || angle >= start;
  }
  return angle >= start && angle <= end;
}

module.exports = {
  preciseTime,
  normalizeAngle,
  angleBetween,
  keyBy,
  Queue,
};
