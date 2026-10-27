/**
 * zMartData.ts
 * Authentic data, dialogues, and layout coordinates for Z-Mart (Room 211).
 * Source: original_resources/floppy/script.211.txt, text.211, view.811, view.361, view.250.
 */

export interface ZMartItemEntry {
  id: string;
  name: string;
  hotkey: string;
}

export const Z_MART_ITEMS: ZMartItemEntry[] = [
  // Page 1: Appliances & Electronics
  { id: 'refrigerator', name: 'Refrigerator', hotkey: '1' },
  { id: 'stove', name: 'Stove', hotkey: '2' },
  { id: 'stereo', name: 'Stereo', hotkey: '3' },
  { id: 'color_tv', name: 'Color TV', hotkey: '4' },
  { id: 'bw_tv', name: 'B&W TV', hotkey: '5' },
  { id: 'microwave', name: 'Microwave', hotkey: '6' },
  { id: 'vcr', name: 'VCR', hotkey: '7' },
  // Page 2: Books, Clothes & Leisure
  { id: 'encyclopedia', name: 'Encyclopedia', hotkey: '8' },
  { id: 'dictionary', name: 'Dictionary', hotkey: '9' },
  { id: 'atlas', name: 'Atlas', hotkey: 'A' },
  { id: 'casual_clothes', name: 'Casual Clothes', hotkey: 'B' },
  { id: 'dress_clothes', name: 'Dress Clothes', hotkey: 'C' },
  { id: 'baseball_tickets', name: 'Baseball Tix', hotkey: 'E' },
  { id: 'theatre_tickets', name: 'Theatre Tix', hotkey: 'F' },
  { id: 'concert_tickets', name: 'Concert Tix', hotkey: 'G' },
  { id: 'dog_food', name: 'Dog Food', hotkey: 'H' },
  { id: '8track', name: '8-Track Tape', hotkey: 'I' },
  { id: 'capote', name: 'Truman Capote', hotkey: 'J' },
];

export const Z_MART_DIALOGUE = {
  welcomeGreetings: [
    "Welcome to Z-Mart. Home of low cost, low quality, and cheap help.",
    "Welcome to Z-Mart, where low prices don't always mean low quality!",
    "Welcome to Z-Mart. Our overhead is so low, the clerks are stoop- shouldered!",
    "Welcome to Z-Mart. Our overhead is so low, we hire only midgets!",
    "Welcome to Z-Mart. If we see a line with more than 50 people waiting, we'll open another!",
    "Welcome to Z-Mart, where our everyday values are other stores' remainders!",
    "Welcome to Z-Mart, where shoddy merchandise comes home to roost!",
    "Welcome to Z-Mart, where yesterday's trash is today's bargain!",
    "Welcome to Z-Mart. If you can't find it here, it must be worth buying!",
    "Welcome to Z-Mart, where Quality is something we often talk about!",
    "Welcome to Z-Mart, where we've closed over 600 stores from coast to coast!"
  ],
  clerkBanter: [
    "Thank you for shopping at Z-Mart.",
    "Have a very good day!",
    "Have you checked out our red light specials?",
    "Please visit us again soon.",
    "Can I have a price check on register two please!",
    "Come back again. We have new specials each week.",
    "If you want cheap, we got it.",
    "Save some for our next...customer.",
    "Well, you get what you pay for!",
    "Check out our new shipment of Taiwanese microwave cozies!",
    "Don't forget to look in Aisle 14 for slightly irregular automobile tires!",
    "Be sure to look for our service department...and if you find it, tell us!",
    "Have you noticed our 83-piece steak knife set for only $4.95?",
    "We're having a special on dented or scratched floppy disks...",
    "Take a look in Aisle 22 for half-price batteries. Sorry, demo batteries only!",
    "If you don't see what you're looking for, look underneath someone else's pile."
  ],
  notEnoughCash: "You do not have enough cash."
};
