/**
 * monolithBurgersData.ts
 * Reverse-engineered text and spatial layout for Monolith Burgers (Fast Food, Room 210).
 * Sources: original_resources/floppy/script.210.txt, text.210, view.810, view.360, view.710, view.250.
 */

export interface MonolithMenuItem {
  id: string;
  label: string;
  dots: string;
  left: number;
  top: number;
  celNum: number;
  foodFile: string;
}

export const MONOLITH_MENU_ITEMS: MonolithMenuItem[] = [
  {
    id: 'hamburger',
    label: 'Hamburgers',
    dots: 'Hamburgers.........',
    left: 10,
    top: 33,
    celNum: 0,
    foodFile: 'food_hamburger.png',
  },
  {
    id: 'cheeseburger',
    label: 'Cheeseburger',
    dots: 'Cheeseburger.......',
    left: 10,
    top: 45,
    celNum: 1,
    foodFile: 'food_cheeseburger.png',
  },
  {
    id: 'astro_chicken',
    label: 'Astro Chicken',
    dots: 'Astro Chicken......',
    left: 75,
    top: 63,
    celNum: 2,
    foodFile: 'food_chicken.png',
  },
  {
    id: 'fries',
    label: 'Fries',
    dots: 'Fries..............',
    left: 75,
    top: 74,
    celNum: 3,
    foodFile: 'food_fries.png',
  },
  {
    id: 'shake',
    label: 'Shakes',
    dots: 'Shakes.............',
    left: 75,
    top: 86,
    celNum: 4,
    foodFile: 'food_shake.png',
  },
  {
    id: 'cola',
    label: 'Colas',
    dots: 'Colas..............',
    left: 75,
    top: 97,
    celNum: 5,
    foodFile: 'food_cola.png',
  },
];

export const MONOLITH_GREETINGS = [
  'Welcome to Monolith Burger. Our Assistant Manager knows the Heimlich Manuever!',
  'Welcome to Monolith Burger. Next week, come meet Monny the Burger Clown!',
  'Welcome to Monolith Burger. You just missed Monny the Burger Clown!',
  "Welcome to Monolith Burger. Buy 'em by the bushel!",
  'Welcome to Monolith Burger. Our food is untouched by human hands, only by teenagers.',
  'Welcome to Monolith Burger. Cleanest restrooms in the game!',
  'Welcome to Monolith Burger. Free bibs with every order of Lobster Nuggets!',
  'Welcome to Monolith Burger. Try a box of Chocolate-Like(R) Cookie Shards!',
  'Welcome to Monolith Burger. Have you played our Guess the Chicken Part Game?',
  'Welcome to Monolith Burger. Special orders will take an extra 45 minutes.',
  'Welcome to Monolith Burger. Our soup today is Cream of Taco.',
  'Welcome to Monolith Burgers. Home of the Toemain Express and the Stomach Pump special.',
  'Welcome to Monolith Burgers, where we use only 100% Pure Extruded Beeflike Product!',
  'Welcome to Monolith Burgers, where even the wrappers have wrappers!',
  'Welcome to Monolith Burgers, where our Food(TM) is patented!',
  'Welcome to Monolith Burgers. Our buns are the softest!',
  'Welcome to Monolith Burgers, where our fat is always freshly rendered!',
  'Welcome to Monolith Burgers, where quality eats are in the bag!',
  'Welcome to Monolith Burgers, where our drinks have twice the ice!',
  'Welcome to Monolith Burgers, where our burgers come from contented cows!',
];

export const MONOLITH_BANTER = [
  'Will that be all?',
  'Would you like fries with that?',
  'Something else with that?',
  'Take some home for your family too.',
  'Have a nice day.',
  'Sounds delicious.',
  'Will that be cash or charge? Tee hee.',
  "Well, aren't WE happy today.",
  'Would you like some Thousand Isla...I mean, Secret Sauce, with that?',
  "Does your Mother know you're eating here?",
  'Incidentally, we also sell used hairnets.',
  'Our pure beef burgers have half the soybeans of the other leading brands!',
  'Would you like some deep-fried potatoes and deep-fried pie with your deep-fried sandwich?',
  'This week only: buy two burgers and get the shakes for free!',
  'You can save 45 minutes by flushing that right now.',
  'Mmmmm...that looks almost good enough to eat!',
  'We now make our sandwiches from 100% biodegradable material!',
  "Is that 'to go,' to eat here, or neither?",
  'Please dispose of trash properly!',
  'Would you like a Prepubescent Irradiated Kung Fu Tortise statuette with that?',
  'Our Manager would like you to sign a petition to abolish the Minimum Wage.',
  "Did you know there's only 45 calories per french fry?",
  "Next to disposable diapers, we're the most familiar sight on the highways!",
  'Have you tried our new Breakfast Chile Releno?',
  'This is my first job, so forgive me if I totally mess up your order.',
  "Try our new Licorice 'n Liver Shake!",
  'Did you want a handful of ketchup packets with that?',
  "Remember, if it's a 6-lb. Beefburger, it must be a Monolith!",
  "Our burgers aren't broiled OR fried...they're poached!",
  'You can find us in any town...just follow the trail of empty wrappers!',
  'Remember...NO food is better than OUR food!',
  'Would you like to take home some complimentary advertising on a placemat?',
  "Our shakes are so thick, you can't even swallow 'em!",
  'Help yourself to a piece of our new 90-foot Compressed Salad Bar!',
  'Free refills if you can finish one cup of our coffee!',
];

export const MONOLITH_NOT_ENOUGH_CASH = 'You do not have enough cash.';
