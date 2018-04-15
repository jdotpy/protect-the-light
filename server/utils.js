Array.prototype.remove = function(item){
    this.splice(this.indexOf(item), 1);
};

function getRandomNumber(start, end) {
  return start + (Math.random() * (end - start));
}

function getRandomInt(start, end) {
  return Math.floor(getRandomNumber(start, end));
}

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

function getVector(x, y, angle, distance) {
  const radians = degreesToRadians(angle);
  const vy = Math.sin(radians) * distance;
  const vx = Math.cos(radians) * distance;
  return { x: x + vx, y: y + vy };
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

function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}

function radiansToDegrees(radians) {
  return radians / (Math.PI / 180);
}

function distanceBetween(from, to) {
  return Math.sqrt(
    Math.pow(from.x - to.x, 2)
    + 
    Math.pow(from.y - to.y, 2)
  );
}

module.exports = {
  preciseTime,
  normalizeAngle,
  getRandomNumber,
  getRandomInt,
  degreesToRadians,
  radiansToDegrees,
  distanceBetween,
  getVector,
  angleBetween,
  keyBy,
  Queue,
};
