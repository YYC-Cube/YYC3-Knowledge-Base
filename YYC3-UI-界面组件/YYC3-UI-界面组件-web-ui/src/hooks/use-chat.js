/**
 * @description useChat Hook
 * @module @yyc3/web-ui/hooks/use-chat
 */
import { useState, useCallback } from 'react';
import { useYYC3Context } from '../provider';
export function useChat() {
    const { hub } = useYYC3Context();
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const sendMessage = useCallback(async (content) => {
        if (!hub)
            return;
        const userMessage = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content,
            timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);
        try {
            const result = await hub.chat(content);
            const assistantMessage = {
                id: `msg-${Date.now()}-response`,
                role: 'assistant',
                content: result.success && result.data ? result.data.content : 'Error',
                timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
        }
        finally {
            setIsLoading(false);
        }
    }, [hub]);
    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);
    return {
        messages,
        isLoading,
        sendMessage,
        clearMessages,
    };
}
//# sourceMappingURL=use-chat.js.map