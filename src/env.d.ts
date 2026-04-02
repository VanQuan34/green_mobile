interface ImportMetaEnv {
  readonly NG_APP_API_URL: string;
  readonly NG_APP_STORAGE_TYPE: 'api' | 'local';
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare var process: {
  env: {
    NG_APP_API_URL: string;
    NG_APP_STORAGE_TYPE: 'api' | 'local';
    [key: string]: any;
  };
};
