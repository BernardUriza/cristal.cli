import { useGame } from "../game/store";
import { GameMode } from "../game/types";

export function ViajeControl() {
  const viaje = useGame((s) => s.viaje);
  const setViaje = useGame((s) => s.setViaje);
  return (
    <button
      type="button"
      className={viaje ? "viaje-toggle on" : "viaje-toggle"}
      aria-pressed={viaje}
      onClick={(e) => {
        setViaje(!viaje);
        e.currentTarget.blur();
      }}
    >
      {viaje ? "VIAJE ON" : "VIAJE OFF"}
    </button>
  );
}

export function ViajeExit() {
  const viaje = useGame((s) => s.viaje);
  const mode = useGame((s) => s.mode);
  if (!viaje) return null;
  const label = mode === GameMode.Console ? "salir de la consola" : mode === GameMode.Room ? "salir del cuarto" : "salir del laberinto";
  const leave = () => {
    const game = useGame.getState();
    if (game.mode === GameMode.Console) return game.exitConsoleMode();
    if (game.mode === GameMode.Room) return game.dismissRoom();
    window.location.href = "/";
  };
  return (
    <button type="button" className="viaje-exit" onClick={leave}>
      {label}
    </button>
  );
}
