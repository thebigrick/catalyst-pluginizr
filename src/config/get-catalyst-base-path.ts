import path from 'node:path';

const getCatalystBasePath = (): string => {
  return path.resolve(path.join(__dirname, '../../../..').replace(/\\/g, '/'));
};

export default getCatalystBasePath;
