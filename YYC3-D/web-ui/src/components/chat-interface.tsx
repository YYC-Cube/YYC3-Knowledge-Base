/**
 * @description ChatInterface Component
 * @module @yyc3/web-ui/components/chat-interface
 */

import React, { useState, type ChangeEvent, type FormEvent } from 'react';
import { useChat } from '../hooks/use-chat';

export function ChatInterface(): JSX.Element {
  const { messages, isLoading, sendMessage } = useChat();
  const [input, setInput] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input.trim());
      setInput('');
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  return React.createElement(
    'div',
    { className: 'yyc3-chat-interface' },
    React.createElement(
      'div',
      { className: 'yyc3-chat-messages' },
      messages.map((msg) =>
        React.createElement(
          'div',
          { key: msg.id, className: `yyc3-chat-message yyc3-chat-message-${msg.role}` },
          msg.content
        )
      ),
      isLoading && React.createElement('div', { className: 'yyc3-chat-loading' }, '思考中...')
    ),
    React.createElement(
      'form',
      { onSubmit: handleSubmit, className: 'yyc3-chat-input-form' },
      React.createElement('input', {
        type: 'text',
        value: input,
        onChange: handleInputChange,
        placeholder: '输入消息...',
        className: 'yyc3-chat-input',
        disabled: isLoading,
      }),
      React.createElement(
        'button',
        { type: 'submit', className: 'yyc3-chat-submit', disabled: isLoading || !input.trim() },
        '发送'
      )
    )
  );
}
