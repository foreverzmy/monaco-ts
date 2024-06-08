import tsConfig from './default.tsconfig.json';

export const TsConfigFileName = '/tsconfig.json';
export const DefaultTsConfig = JSON.stringify(tsConfig, null, 2);

export const demoFiles = [
  {
    filepath: '/tsconfig.json',
    content: DefaultTsConfig
  }
]
