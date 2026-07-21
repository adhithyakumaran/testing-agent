import { askLLM } from './index';

askLLM('You are a helpful assistant.', 'Say hello in one sentence.')
  .then(console.log)
  .catch(console.error);