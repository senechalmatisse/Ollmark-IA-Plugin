/// <reference types="vite/client" />

/**
 * Typage des variables d'environnement exposées au code Angular compilé.
 */
interface ImportMetaEnv {
    /** URL de base de l'API Spring Boot */
    readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}