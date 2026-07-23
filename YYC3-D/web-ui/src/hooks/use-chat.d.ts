/**
 * @description useChat Hook
 * @module @yyc3/web-ui/hooks/use-chat
 */
interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}
export declare function useChat(): {
    messages: Message[];
    isLoading: boolean;
    sendMessage: (content: string) => Promise<void>;
    clearMessages: () => void;
};
export {};
//# sourceMappingURL=use-chat.d.ts.map