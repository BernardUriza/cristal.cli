export type BoardFit = { columns: number; rows: number; cardWidth: number };

export type BoardFitInput = { cards: number; width: number; height: number; gap: number; aspect: number };

function fitFor(columns: number, { cards, width, height, gap, aspect }: BoardFitInput): BoardFit {
  const rows = Math.ceil(cards / columns);
  const byWidth = (width - (columns - 1) * gap) / columns;
  const byHeight = ((height - (rows - 1) * gap) / rows) * aspect;
  return { columns, rows, cardWidth: Math.max(0, Math.floor(Math.min(byWidth, byHeight))) };
}

export function fitBoard(input: BoardFitInput): BoardFit {
  let best = fitFor(1, input);
  for (let columns = 2; columns <= input.cards; columns++) {
    const fit = fitFor(columns, input);
    const emptyNow = fit.columns * fit.rows - input.cards;
    const emptyBest = best.columns * best.rows - input.cards;
    if (fit.cardWidth > best.cardWidth || (fit.cardWidth === best.cardWidth && emptyNow < emptyBest)) best = fit;
  }
  return best;
}
