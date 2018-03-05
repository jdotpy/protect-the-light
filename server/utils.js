// Make extending objects have a nice syntax
Object.prototype.extend = function(subject) {
  subject.__proto__ = this
  if (subject.__init__) {
    subject.__init__();
  }
  return subject;
};

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

module.exports = {
  preciseTime,
  keyBy,
  Queue,
};
