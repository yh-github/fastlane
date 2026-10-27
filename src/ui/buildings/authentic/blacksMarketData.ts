/**
 * blacksMarketData.ts
 * Authentic data, dialogues, and layout coordinates for Black's Market (Room 203).
 * Source: original_resources/floppy/script.203.txt, text.203, view.803, view.353, view.250.
 */

export interface MarketItemEntry {
  id: string;
  name: string;
  top: number;
  left: number;
  hotkey: string;
}

export const BLACKS_MARKET_ITEMS: MarketItemEntry[] = [
  { id: 'food_1week', name: 'Food (1 Week)', top: 31, left: 6, hotkey: '1' },
  { id: 'food_2weeks', name: 'Food (2 Weeks)', top: 46, left: 6, hotkey: '2' },
  { id: 'food_4weeks', name: 'Food (4 Weeks)', top: 64, left: 75, hotkey: '3' },
  { id: 'lottery_tickets', name: 'Lottery Ticket', top: 79, left: 74, hotkey: '4' },
  { id: 'newspaper', name: 'Newspaper', top: 94, left: 75, hotkey: '5' },
];

export const BLACKS_MARKET_DIALOGUE = {
  welcomeGreetings: [
    "Welcome to Black's Market. Where quality and service are unherd of and you will stand in line forever.",
    "Welcome to Black's Market, where you can grow old in our checkout lines.",
    "Welcome to Black's Market. Our meats are a cut above!",
    "Welcome to Black's Market. You can't beat our eggs!",
    "Welcome to Black's Market, where every day is Double Coupon Day!",
    "Welcome to Black's Market. Look for our special on day-old sushi!",
    "Welcome to Black's Market. Open all day and night for your binging pleasure!",
    "Welcome to Black's Market. Lowest prices in town on pickled octopus!",
    "Welcome to Black's Market. Hey, check out those melons!",
    "Welcome to Black's Market. Our butcher loves to stop and chat!",
    "Welcome to Black's Market. Don't bypass our artichoke hearts!",
    "Welcome to Black's Market. This time, please don't take home our shopping cart!",
    "Welcome to Black's Market, the grosser grocer!",
    "Welcome to Black's Market. Our Swiss Cheese is made from Hole Milk!"
  ],
  clerkBanter: [
    "Mr. Schwader to 6 for check approval...Mr. Schwader to 6 for check approval...",
    "Would you like fries with that? Oops, sorry, I usedta work at Monolith.",
    "Just so you know, we saw you eating those grapes in the produce section.",
    "Cookies, ice cream and soda? Any REAL food in that shopping cart?",
    "If you wanna write a check, I need 8 forms of ID and a blood sample.",
    "You had eleven items, not ten. Next time, use the right aisle!",
    "One of your eggs is broken. Better use it quickly.",
    "Price check, please...a 5-pound box of Quintuple-Stuff Sandwhich Cookies.",
    "Have you tried the Deli Department's Cheezy Sweet 'n Saurkraut loaf?",
    "Thank You. See you next time",
    "Will that be paper or plastic?",
    "Have a Good day.",
    "We appreciate your business.",
    "It's clear that you are a person who knows how to shop.",
    "I'm happy to see that you're well today.",
    "Thank you for shopping at Black's Market.",
    "Next time, give peas a chance!",
    "No tipping, please!",
    "Can we help you out to your marble?",
    "Come back for all your grocery needs!",
    "Say, two more trips and you'll have enough stamps!",
    "Hope you didn't buy any of those recalled mushrooms last week!",
    "Next time, don't dent the cans and expect a discount.",
    "Your selection of food indicates you're compensating for a lack of love.",
    "Please be more careful with the mayonnaise in Aisle 7 next time.",
    "Arugla, Raddichio and Belgian Endive? What a yuppie!",
    "I'm sorry we were out of those little corns this week.",
    "Would you like to be a checker? OK. YOU'RE A RED ONE.",
    "Look in our Italian Pet Food section for Dog Ciao!",
    "If you can find lower prices on groceries, you're playing a different game!"
  ],
  notEnoughCash: "You do not have enough cash."
};
