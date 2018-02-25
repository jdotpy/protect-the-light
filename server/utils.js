// Make extending objects have a nice syntax
Object.prototype.extend = function(subject){subject.__proto__ = this};

function preciseTime() {
  const timeSections = process.hrtime();
  const seconds = timeSections[0] + timeSections[1] / 1000000000;
}


module.exports = {
  preciseTime,
}
