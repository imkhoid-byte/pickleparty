import type { PartyPrompt } from '../game/party';

/** Turn an on-screen prompt into something a text-to-speech voice reads naturally. */
export function speechText(prompt: Pick<PartyPrompt, 'title' | 'body'>): string {
  const title = prompt.title.replace(/[.!?]$/, '');
  // Don't read the headline twice when the text starts with it ("House Rule! House rule: …").
  const key = (t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, '');
  const lead = prompt.body.match(/^([^:.!?]{1,30})[:.!?]\s*/);
  const body = lead && key(lead[1]) === key(title) ? prompt.body.slice(lead[0].length) : prompt.body;
  return `${title}! ${body}`
    .replace(/\p{Extended_Pictographic}|️|‍/gu, '')
    .replace(/(\d+)-(\d+)/g, '$1 to $2')
    .replace(/\s*&\s*/g, ' and ')
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .replace(/^[!\s]+/, '')
    .trim();
}
