import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewspaperModal } from './NewspaperModal';
import type { GameEvent } from '../engine/gameState';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: any) => {
      if (typeof defaultValue === 'string') return defaultValue;
      return key;
    },
  }),
}));

describe('NewspaperModal', () => {
  it('renders nothing when headline is null', () => {
    const { container } = render(<NewspaperModal headline={null} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders main headline without Market Watch column when stockTip is absent', () => {
    const headline: GameEvent = {
      key: 'newspaper.random.1',
    };
    const onClose = vi.fn();

    render(<NewspaperModal headline={headline} onClose={onClose} />);

    expect(screen.getByText('THE DAILY NEWS')).toBeInTheDocument();
    expect(screen.getByText('newspaper.random.1')).toBeInTheDocument();
    expect(screen.queryByTestId('market-watch-column')).not.toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders Market Watch column with Strong Buy badge when stockTip action is buy', () => {
    const headline: GameEvent = {
      key: 'newspaper.stocks.gold_up',
      stockTip: {
        commodityId: 'gold',
        action: 'buy',
        headlineKey: 'newspaper.stockTips.gold_buy_headline',
        detailKey: 'newspaper.stockTips.gold_buy_detail',
      },
    };

    render(<NewspaperModal headline={headline} onClose={vi.fn()} />);

    expect(screen.getByText('newspaper.stocks.gold_up')).toBeInTheDocument();
    const marketWatch = screen.getByTestId('market-watch-column');
    expect(marketWatch).toBeInTheDocument();
    expect(screen.getByText('STRONG BUY')).toBeInTheDocument();
    expect(screen.getByText('newspaper.stockTips.gold_buy_headline')).toBeInTheDocument();
    expect(screen.getByText('newspaper.stockTips.gold_buy_detail')).toBeInTheDocument();
  });

  it('renders Market Watch column with Strong Sell badge when stockTip action is sell', () => {
    const headline: GameEvent = {
      key: 'newspaper.random.2',
      stockTip: {
        commodityId: 'penny_stocks',
        action: 'sell',
        headlineKey: 'newspaper.stockTips.penny_stocks_sell_headline',
        detailKey: 'newspaper.stockTips.penny_stocks_sell_detail',
      },
    };

    render(<NewspaperModal headline={headline} onClose={vi.fn()} />);

    expect(screen.getByTestId('market-watch-column')).toBeInTheDocument();
    expect(screen.getByText('STRONG SELL')).toBeInTheDocument();
    expect(screen.getByText('newspaper.stockTips.penny_stocks_sell_headline')).toBeInTheDocument();
    expect(screen.getByText('newspaper.stockTips.penny_stocks_sell_detail')).toBeInTheDocument();
  });

  it('renders Market Watch column with Hold badge when stockTip action is hold', () => {
    const headline: GameEvent = {
      key: 'newspaper.random.3',
      stockTip: {
        commodityId: 'blue_chip',
        action: 'hold',
        headlineKey: 'newspaper.stockTips.blue_chip_hold_headline',
        detailKey: 'newspaper.stockTips.blue_chip_hold_detail',
      },
    };

    render(<NewspaperModal headline={headline} onClose={vi.fn()} />);

    expect(screen.getByTestId('market-watch-column')).toBeInTheDocument();
    expect(screen.getByText('HOLD / NEUTRAL')).toBeInTheDocument();
    expect(screen.getByText('newspaper.stockTips.blue_chip_hold_headline')).toBeInTheDocument();
    expect(screen.getByText('newspaper.stockTips.blue_chip_hold_detail')).toBeInTheDocument();
  });
});
