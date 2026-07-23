/**
 * @description YYC³ Auth - 统一认证管理
 * @module @yyc3/core/auth
 */
class OpenAIAuthProvider {
    id = 'openai';
    name = 'OpenAI';
    type = 'openai';
    apiKey = null;
    client = null;
    async initialize() {
        this.apiKey = process.env.OPENAI_API_KEY ?? null;
        if (!this.apiKey) {
            throw new Error('OPENAI_API_KEY not found');
        }
    }
    isAuthenticated() {
        return this.apiKey !== null;
    }
    getCredentials() {
        return {
            type: 'api-key',
            token: this.apiKey ?? undefined,
            models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        };
    }
    async validate() {
        return this.apiKey !== null;
    }
    async chat(message) {
        return {
            content: `[OpenAI Response] ${message}`,
            model: 'gpt-4',
            timestamp: Date.now(),
        };
    }
}
class OllamaAuthProvider {
    id = 'ollama';
    name = 'Ollama';
    type = 'ollama';
    endpoint;
    models = [];
    constructor(endpoint) {
        this.endpoint = endpoint ?? 'http://localhost:11434';
    }
    async initialize() {
        try {
            const response = await fetch(`${this.endpoint}/api/tags`);
            const data = await response.json();
            this.models = data.models.map((m) => m.name);
        }
        catch {
            this.models = [];
        }
    }
    isAuthenticated() {
        return this.models.length > 0;
    }
    getCredentials() {
        return {
            type: 'local',
            endpoint: this.endpoint,
            models: this.models,
        };
    }
    async validate() {
        try {
            const response = await fetch(`${this.endpoint}/api/tags`);
            return response.ok;
        }
        catch {
            return false;
        }
    }
    async chat(message) {
        return {
            content: `[Ollama Response] ${message}`,
            model: this.models[0] ?? 'llama2',
            timestamp: Date.now(),
        };
    }
}
export class YYC3Auth {
    providers = new Map();
    activeProvider = null;
    config;
    constructor(config = {}) {
        this.config = config;
    }
    async initialize() {
        if (this.config.openaiApiKey ?? process.env.OPENAI_API_KEY) {
            const provider = new OpenAIAuthProvider();
            await provider.initialize();
            this.providers.set('openai', provider);
            this.activeProvider = provider;
            return provider;
        }
        const ollamaProvider = new OllamaAuthProvider(this.config.ollamaEndpoint);
        await ollamaProvider.initialize();
        if (ollamaProvider.isAuthenticated()) {
            this.providers.set('ollama', ollamaProvider);
            this.activeProvider = ollamaProvider;
            return ollamaProvider;
        }
        throw new Error('No authentication provider available');
    }
    getProvider() {
        return this.activeProvider;
    }
    getProviderById(id) {
        return this.providers.get(id);
    }
    getAllProviders() {
        return Array.from(this.providers.values());
    }
}
//# sourceMappingURL=index.js.map