import type { PartyPrompt } from '../game/party';

/** Turn an on-screen prompt into something a text-to-speech voice reads naturally. */
export function speechText(prompt: Pick<PartyPrompt, 'title' | 'body'>): string {
  const title = prompt.title.replace(/[.!?]$/, '');
  return `${title}! ${prompt.body}`
    .replace(/\p{Extended_Pictographic}|️|‍/gu, '')
    .replace(/(\d+)-(\d+)/g, '$1 to $2')
    .replace(/\s*&\s*/g, ' and ')
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/^[!\s]+/, '')
    .trim();
}
