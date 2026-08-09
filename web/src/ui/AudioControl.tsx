import { useSyncExternalStore } from "react";
import {
  getAudioSettings,
  setMusicMuted,
  setMusicVolume,
  subscribeAudioSettings,
} from "../game/MusicDirector";

export function AudioControl() {
  const settings = useSyncExternalStore(subscribeAudioSettings, getAudioSettings);

  return (
    <div
      className="audio-control"
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className={settings.muted ? "audio-mute muted" : "audio-mute"}
        aria-label={settings.muted ? "Unmute music" : "Mute music"}
        onClick={(e) => {
          setMusicMuted(!settings.muted);
          e.currentTarget.blur();
        }}
      >
        {settings.muted ? "SND OFF" : "SND ON"}
      </button>
      <input
        type="range"
        className="audio-volume"
        aria-label="Music volume"
        min={0}
        max={1}
        step={0.05}
        value={settings.volume}
        disabled={settings.muted}
        onChange={(e) => setMusicVolume(Number(e.target.value))}
        onPointerUp={(e) => e.currentTarget.blur()}
      />
    </div>
  );
}
