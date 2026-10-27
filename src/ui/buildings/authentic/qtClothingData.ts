/**
 * qtClothingData.ts
 * Authentic data, dialogues, and layout coordinates for QT Clothing (Room 209).
 * Source: original_resources/floppy/script.209.txt, text.209, view.809, view.359, view.250.
 */

export interface ClothingItemEntry {
  id: string;
  name: string;
  top: number;
  left: number;
  hotkey: string;
}

export const QT_CLOTHING_ITEMS: ClothingItemEntry[] = [
  { id: 'business_suit', name: 'Business Suit', top: 63, left: 84, hotkey: '1' },
  { id: 'dress_clothes', name: 'Dress Clothes', top: 78, left: 84, hotkey: '2' },
  { id: 'casual_clothes', name: 'Casual Clothes', top: 93, left: 84, hotkey: '3' },
];

export const QT_CLOTHING_DIALOGUE = {
  welcomeGreetings: [
    "Welcome to QT Clothing. We will sell you anything, no matter how bad it looks.",
    "Welcome to QT Clothing. Meet our tailor, Howie Fitzhugh!",
    "Welcome to QT Clothing. Our ties don't bind and our belts are a cinch.",
    "Welcome to QT Clothing. We have legal briefs and law suits.",
    "Welcome to QT Clothing, open 24 hours...we never clothes!",
    "Welcome to QT Clothing. Thursday is Double Shoulder Pad Day!",
    "Welcome to QT Clothing. Wear our clothes and you'll be a QT, too!",
    "Welcome to QT Clothing. The only place in the world where you can buy just 1 pant!",
    "Welcome to QT Clothing. Try on our soothing new Medicated Turtlenecks!"
  ],
  clerkBanter: [
    "My! Don't WE look nice today!",
    "It's the real you.",
    "Spiffy.",
    "Faaabulous!!!",
    "Our clothes are of the highest quality.",
    "Have a wonderful day!",
    "Lookin' good!",
    "You can't go wong at QT.",
    "Perhaps you should stock up now while the prices are so reasonable!",
    "With your figure, perhaps you should consider going to a tent and awning store!",
    "Oooh, you look good enough to eat!",
    "Don't you just love the new spring fashions? Tres magnifique!",
    "It's nice like that, just a tad tight around the bottom.",
    "Good choice...rayon is back in this year!",
    "Now what are you going to do about your HAIR?",
    "Don't forget to accessorize!",
    "Nice! It really accentuates those pectorals.",
    "You know, a little tummy tuck would take care of that slight bulging in the front.",
    "Stop slouching and it won't crease across the torso.",
    "With a physique like yours, you could wear ANYthing!",
    "Let me mention just two little words. Lipo. Suction."
  ],
  notEnoughCash: "You do not have enough cash."
};
