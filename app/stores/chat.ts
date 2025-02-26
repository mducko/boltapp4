import { atom, map } from 'nanostores';
import type { Message } from 'ai';

export const chatStore = map({
  messages: [] as Message[],
  isStreaming: false,
});

export function addMessage(message: Message) {
  const messages = chatStore.get().messages;
  chatStore.setKey('messages', [...messages, message]);
}

export function setStreaming(isStreaming: boolean) {
  chatStore.setKey('isStreaming', isStreaming);
}