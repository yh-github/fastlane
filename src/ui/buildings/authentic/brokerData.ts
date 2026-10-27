/**
 * brokerData.ts
 * Reverse-engineered text, sprites, and spatial layout for the Stock Market / Broker (Room 213).
 * Sources: original_resources/floppy/script.213.txt, text.213, view.696, view.250.
 */

export interface BrokerStockItem {
  id: string; // Campaign stock id
  name: string;
  bannerFile: string;
  top: number;
  celNum: number;
  fixedPrice?: number;
}

export const BROKER_STOCK_ITEMS: BrokerStockItem[] = [
  { id: 'tbills', name: 'T-Bills', bannerFile: 'tbills.png', top: 27, celNum: 0, fixedPrice: 100 },
  { id: 'gold', name: 'Gold', bannerFile: 'gold.png', top: 40, celNum: 1 },
  { id: 'silver', name: 'Silver', bannerFile: 'silver.png', top: 53, celNum: 2 },
  { id: 'pork_bellies', name: 'Pork Bellies', bannerFile: 'pork_bellies.png', top: 66, celNum: 3 },
  { id: 'blue_chip', name: 'Blue Chip Stocks', bannerFile: 'blue_chip.png', top: 79, celNum: 4 },
  { id: 'penny_stocks', name: 'Penny Stocks', bannerFile: 'penny_stocks.png', top: 92, celNum: 5 },
];

export const BROKER_DIALOGUE = {
  notEnoughCash: 'You do not have enough cash.',
  marketValueHeader: 'Market\nValue',
  yourHoldingsHeader: 'Your\nHoldings',
  tBillFee: "A $3 Broker's fee is deducted for the sale of each T-Bill.",
  noShares: 'You do not own any shares.',
  boughtShare: 'You bought 1 share of %s.',
  soldShare: 'You sold 1 share of %s.',
};
