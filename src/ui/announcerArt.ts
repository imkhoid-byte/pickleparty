import type { ImageSourcePropType } from 'react-native';

import type { AnnouncerId } from '../audio/personas';

/**
 * The Pro announcers' character art (drawn for PickleParty; the SVG sources sit
 * next to the PNGs in assets/announcers). Classic has none: it's just a voice.
 */
export const ANNOUNCER_ART: Partial<Record<AnnouncerId, { image: ImageSourcePropType; caption: string }>> = {
  squeaky: { image: require('../../assets/announcers/squeaky.png'), caption: 'Squeaky Pickle says…' },
  bigdill: { image: require('../../assets/announcers/bigdill.png'), caption: 'Big Dill remarks…' },
};
