/**
 * One quote per day, chosen deterministically from the day of the year — so
 * everyone signing in on the same day sees the same line, and it changes at
 * midnight without any scheduled job.
 *
 * Add or replace freely; the rotation adapts to the length of the list.
 */
export type Quote = { text: string; author: string };

export const QUOTES: Quote[] = [
  { text: "Quality is never an accident. It is always the result of intelligent effort.", author: "John Ruskin" },
  { text: "Take care of the customer and the business will take care of itself.", author: "Ray Kroc" },
  { text: "The details are not the details. They make the design.", author: "Charles Eames" },
  { text: "However beautiful the strategy, you should occasionally look at the results.", author: "Winston Churchill" },
  { text: "Well done is better than well said.", author: "Benjamin Franklin" },
  { text: "It is not the beauty of a building you should look at; it is the construction of the foundation.", author: "David Allan Coe" },
  { text: "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.", author: "Antoine de Saint-Exupéry" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "Excellence is doing ordinary things extraordinarily well.", author: "John W. Gardner" },
  { text: "Care more than others think wise. Risk more than others think safe.", author: "Howard Schultz" },
  { text: "You can't build a reputation on what you are going to do.", author: "Henry Ford" },
  { text: "A satisfied customer is the best business strategy of all.", author: "Michael LeBoeuf" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "Do not wait to strike till the iron is hot, but make it hot by striking.", author: "William Butler Yeats" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "The best time to plant a tree was twenty years ago. The second best time is now.", author: "Proverb" },
  { text: "Hospitality is almost impossible to teach. It's all about hiring the right people.", author: "Danny Meyer" },
  { text: "What gets measured gets managed.", author: "Peter Drucker" },
  { text: "Amateurs talk strategy. Professionals talk logistics.", author: "Omar Bradley" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "In the middle of difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "If you don't have time to do it right, when will you have time to do it over?", author: "John Wooden" },
  { text: "Efficiency is doing things right; effectiveness is doing the right things.", author: "Peter Drucker" },
  { text: "You don't get a second chance to make a first impression.", author: "Andrew Grant" },
  { text: "Great things are done by a series of small things brought together.", author: "Vincent van Gogh" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "The elevator to success is out of order. You'll have to use the stairs.", author: "Joe Girard" },
  { text: "People do not decide to become extraordinary. They decide to accomplish extraordinary things.", author: "Edmund Hillary" },
  { text: "Trust is built in very small moments.", author: "John Gottman" },
  { text: "Whatever you are, be a good one.", author: "Attributed to Abraham Lincoln" },
  { text: "Action expresses priorities.", author: "Mahatma Gandhi" },
  { text: "Beware the barrenness of a busy life.", author: "Socrates" },
  { text: "The reward for work well done is the opportunity to do more.", author: "Jonas Salk" },
  { text: "There are no traffic jams along the extra mile.", author: "Roger Staubach" },
  { text: "Attention is the rarest and purest form of generosity.", author: "Simone Weil" },
  { text: "Make everything as simple as possible, but not simpler.", author: "Albert Einstein" },
  { text: "The person who moves a mountain begins by carrying away small stones.", author: "Confucius" },
  { text: "You cannot escape the responsibility of tomorrow by evading it today.", author: "Abraham Lincoln" },
  { text: "Politeness goes far, yet costs nothing.", author: "Samuel Smiles" },
  { text: "It is not enough to be busy. The question is: what are we busy about?", author: "Henry David Thoreau" },
  { text: "Motivation gets you started. Habit keeps you going.", author: "Jim Rohn" },
  { text: "The customer's perception is your reality.", author: "Kate Zabriskie" },
  { text: "Slow is smooth, and smooth is fast.", author: "Proverb" },
  { text: "A goal without a plan is just a wish.", author: "Antoine de Saint-Exupéry" },
  { text: "Don't find fault. Find a remedy.", author: "Henry Ford" },
  { text: "The standard you walk past is the standard you accept.", author: "David Morrison" },
  { text: "Nothing is particularly hard if you divide it into small jobs.", author: "Henry Ford" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act but a habit.", author: "Will Durant" },
  { text: "Good order is the foundation of all things.", author: "Edmund Burke" },
  { text: "If you want to go fast, go alone. If you want to go far, go together.", author: "Proverb" },
  { text: "Only put off until tomorrow what you are willing to die having left undone.", author: "Pablo Picasso" },
  { text: "Be regular and orderly in your life, so that you may be violent and original in your work.", author: "Gustave Flaubert" },
  { text: "The greatest wealth is to live content with little.", author: "Plato" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg" },
  { text: "You miss one hundred percent of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "There is no substitute for paying attention.", author: "Diane Sawyer" },
  { text: "Chance favours the prepared mind.", author: "Louis Pasteur" },
  { text: "How we spend our days is, of course, how we spend our lives.", author: "Annie Dillard" },
  { text: "Never mistake motion for action.", author: "Ernest Hemingway" },
  { text: "The difference between ordinary and extraordinary is that little extra.", author: "Jimmy Johnson" },
  { text: "Be so good they can't ignore you.", author: "Steve Martin" },
  { text: "A ship in harbour is safe, but that is not what ships are built for.", author: "John A. Shedd" },
  { text: "Fall seven times, stand up eight.", author: "Japanese proverb" },
  { text: "The best way out is always through.", author: "Robert Frost" },
  { text: "Give me six hours to chop down a tree and I will spend the first four sharpening the axe.", author: "Attributed to Abraham Lincoln" },
  { text: "Order and simplification are the first steps toward mastery of a subject.", author: "Thomas Mann" },
  { text: "Small deeds done are better than great deeds planned.", author: "Peter Marshall" },
  { text: "The sea, once it casts its spell, holds one in its net of wonder forever.", author: "Jacques Cousteau" },
  { text: "Patience is bitter, but its fruit is sweet.", author: "Aristotle" },
  { text: "Whatever you do, do it well.", author: "Walt Disney" },
  { text: "Luck is what happens when preparation meets opportunity.", author: "Seneca" },
  { text: "To improve is to change; to be perfect is to change often.", author: "Winston Churchill" },
  { text: "Nothing will work unless you do.", author: "Maya Angelou" },
  { text: "The single biggest problem in communication is the illusion that it has taken place.", author: "William H. Whyte" },
  { text: "Look after the pennies and the pounds will look after themselves.", author: "Proverb" },
  { text: "Have nothing in your houses that you do not know to be useful or believe to be beautiful.", author: "William Morris" },
  { text: "The obstacle is the way.", author: "Marcus Aurelius" },
  { text: "Begin at the beginning and go on till you come to the end; then stop.", author: "Lewis Carroll" },
  { text: "Enthusiasm is common. Endurance is rare.", author: "Angela Duckworth" },
  { text: "If everything seems under control, you're not going fast enough.", author: "Mario Andretti" },
  { text: "It is better to take many small steps in the right direction than a great leap forward only to stumble backward.", author: "Proverb" },
  { text: "You can do anything, but not everything.", author: "David Allen" },
  { text: "Clear is kind.", author: "Brené Brown" },
  { text: "Between saying and doing, many a pair of shoes is worn out.", author: "Italian proverb" },
];

/** Days since the epoch — changes at local midnight. */
function dayIndex(date = new Date()): number {
  const local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor(local.getTime() / 864e5);
}

export function quoteOfTheDay(date = new Date()): Quote {
  const i = ((dayIndex(date) % QUOTES.length) + QUOTES.length) % QUOTES.length;
  return QUOTES[i]!;
}
