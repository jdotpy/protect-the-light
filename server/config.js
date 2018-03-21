const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  engine: {
    loopInterval: isProd ? 17 : 40,
  },
}
