/**
 * socketCityData.ts
 * Authentic data, dialogues, and layout coordinates for Socket City (Room 208).
 * Source: original_resources/floppy/script.208.txt, text.208, view.808, view.358, view.250.
 */

export interface ApplianceItemEntry {
  id: string;
  name: string;
  top: number;
  left: number;
  hotkey: string;
}

export const SOCKET_CITY_ITEMS: ApplianceItemEntry[] = [
  { id: 'refrigerator', name: 'Refrigerator', top: 31, left: 77, hotkey: '1' },
  { id: 'freezer', name: 'Freezer', top: 39, left: 77, hotkey: '2' },
  { id: 'stove', name: 'Stove', top: 47, left: 77, hotkey: '3' },
  { id: 'color_tv', name: 'Color TV', top: 60, left: 10, hotkey: '4' },
  { id: 'vcr', name: 'VCR', top: 68, left: 10, hotkey: '5' },
  { id: 'stereo', name: 'Stereo', top: 76, left: 10, hotkey: '6' },
  { id: 'microwave', name: 'Microwave', top: 84, left: 10, hotkey: '7' },
  { id: 'hot_tub', name: 'Hot Tub', top: 92, left: 10, hotkey: '8' },
  { id: 'computer', name: 'Computer', top: 100, left: 10, hotkey: '9' },
];

export const SOCKET_CITY_DIALOGUE = {
  welcomeGreetings: [
    "Welcome to Socket City. If you paid full price, you must've bought it here!",
    "Welcome to Socket City. You're just in time for our Pre-Arbor Day Value Fest!",
    "Welcome to Socket City. Apply for our Revolving Algorithmic Usury Credit Line!",
    "Welcome to Socket City. Our salespeople are here to help you...spend!",
    "Welcome to Socket City. Special today on useless Yuppie electronic gadgets!",
    "Welcome to Socket City. We only charge 10% over list price!",
    "Welcome to Socket City. Go ahead and TRY to talk us down.",
    "Welcome to Socket City. Next Friday is Double Commission Day!"
  ],
  clerkBanter: [
    "Would you like to purchase a service contract for that?",
    "Would you like an extended warranty with that?",
    "Look into our Low-Rate, Low-Down, Balloon-Payment Loan Plan!",
    "Would you like a Gold Star Service Plan with that?",
    "You know you really should purchase our Extended Service Contract.",
    "Be sure to have our Certified Technician install that!",
    "May we deliver that in our Insured and Bonded Van?",
    "Have our Factory-Trained Technician align your tape heads!",
    "May I interest you in our Low-Cost Lifetime Service Policy?",
    "Why not join our Customer Convenience Club?",
    "Next time, bring in a competitor's coupon and we'll honor it!",
    "May we send you our full-color monthly flyer?",
    "Are you protected by our Pre-Disaster Service Contract?",
    "Did you know our Extended Service Contract is transferable?",
    "Buy 2 more and we'll throw in a set of fake wood side panels!",
    "Take advantage of our 10-Day, No Questions Asked Return Policy!",
    "Just think, you own a product that's backed by our Good Neighbor Policy!",
    "Have you seen our fully-integrated home multi-media system?",
    "We have a full line of 8mm and VHS camcorders!",
    "Thank you for shopping at Socket City.",
    "Quality service is our first and only name.",
    "A fine product made by Taiwanese political prisoners.",
    "If it has a knob or plug, Socket City has it!",
    "Have you seen our high-speed, laser-driven CD-ROM system?",
    "Our salespeople work on non-commissioned enthusiasm!",
    "Did you know our factory outlet is open this weekend?",
    "If it breaks within the first 10 minutes, bring it right back!",
    "Ask our salesperson to show you our high-tech car alarm systems!",
    "Don't forget that Socket City has a complete cellular phone department!",
    "Be sure to have your name put on our Preferred Customer mailing list!",
    "Did you know our repair department uses only genuine simulated parts?",
    "Our service contract also protects you against meteor strikes!",
    "We're having a big, 2-day parking lot sale this Saturday!",
    "Come in next week for our pre-clearance inventory mark-down!",
    "Did you know that consumer satisfaction is our second-most important goal?",
    "We finance 90 Days, Same as Bankruptcy!",
    "With every purchase over $5200, we're giving away free Chapter 11 forms!",
    "Please be aware that our Extended Service Contract excludes parts and labor.",
    "If you're not completely satisfied, we'll be glad to give you someone else's money back!"
  ],
  notEnoughCash: "You do not have enough cash."
};
