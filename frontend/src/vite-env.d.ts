/// <reference types="vite/client" />

declare module '*.css';

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
	readonly VITE_BLOG_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
