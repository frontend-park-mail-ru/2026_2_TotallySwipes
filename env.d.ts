declare module '*.hbs' {
    const template: (context?: object) => string;
    export default template;
}

interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    readonly VITE_USE_MOCKS?: 'true' | 'false';
}
