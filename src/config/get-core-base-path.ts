import path from 'node:path';

const getCoreBasePath = (): string => {
  return path.join(__dirname, '../../../..', 'core').replace(/\\/g, '/');
};

export default getCoreBasePath;
