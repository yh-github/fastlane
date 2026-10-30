/**
 * universityData.ts
 * Authentic data, dialogues, and layout coordinates for Hi-Tech U (Room 207).
 * Source: original_resources/floppy/script.207.txt, text.207, view.807, view.357, view.250.
 */

export const UNIVERSITY_COURSE_BOOKS: Record<string, { bookIndex: number; title: string }> = {
  trade_school: { bookIndex: 0, title: 'Trade School' },
  electronics: { bookIndex: 1, title: 'Electronics' },
  pre_engineering: { bookIndex: 2, title: 'Pre-Engineering' },
  engineering: { bookIndex: 3, title: 'Engineering' },
  junior_college: { bookIndex: 4, title: 'Junior College' },
  business_admin: { bookIndex: 5, title: 'Business Admin' },
  academic: { bookIndex: 6, title: 'Academic' },
  graduate_school: { bookIndex: 7, title: 'Graduate School' },
  post_doctoral: { bookIndex: 8, title: 'Post-Doctoral' },
  research: { bookIndex: 9, title: 'Research' },
  publishing: { bookIndex: 10, title: 'Publishing' },
};

export const UNIVERSITY_DIALOGUE = {
  welcomeGreetings: [
    "Welcome to Hi-Tech U. We will learn you for the future.",
    "Welcome to Hi-Tech U. We'll learn you to talk English good!",
    "Welcome to Hi-Tech U. Our Geology classes will put rocks in your head!",
    "Welcome to Hi-Tech U, where you'll never be bored of education!",
    "Welcome to Hi-Tech U. Enroll now for the third trimester!",
    "Welcome to Hi-Tech U. All our professors have tweed jackets with elbow patches!",
    "Welcome to Hi-Tech U. Our diplomas are genuine cheepskin!",
    "Welcome to Hi-Tech U. Our alumni haven't complained yet!",
    "Welcome to Hi-Tech U. The alma mater of the stars!",
    "Welcome to Hi-Tech U. We don't have grades, we have opinions!",
    "Welcome to Hi-Tech U. We teach you things you never wanted to know!"
  ],
  clerkBanter: [
    "A fine academic pursuit. Just don't forget to pay your tuition!",
    "Our library has books on every subject, mostly out of date!",
    "Study hard and one day you might understand your professor!",
    "Education is the key to unlocking lower-paying jobs!",
    "Remember, plagiarism is the sincerest form of scholarship here!",
    "Congratulations on your desire for intellectual improvement!",
    "Keep this up and you'll qualify for higher management positions!",
    "Knowledge is power, but a degree is negotiable!",
    "Our research department just proved that water is indeed wet!",
    "Welcome to another rigorous trimester of enlightenment!"
  ],
  notEnoughCash: "You do not have enough cash.",
  needToEnroll: "You need to enroll in a class first.",
  noTime: "No time is left to go to class.",
  selectClass: "Thank You. You may select the class of your choice.",
  noClasses: "Perhaps next year we will have more classes to offer to you."
};
