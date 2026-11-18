import { useSyncExternalStore } from 'react';
import { subscribe, getSnapshot, togglePlay, setAnc, setUiSounds } from './audioEngine';

// { playing, anc: 'off' | 'noisy' | 'cancelled', uiSounds } plus the actions.
export function useAudioDemo() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { ...state, togglePlay, setAnc, setUiSounds };
}
