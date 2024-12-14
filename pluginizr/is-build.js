const isBuild = () => process.env.NODE_ENV === 'production';

module.exports = isBuild;
