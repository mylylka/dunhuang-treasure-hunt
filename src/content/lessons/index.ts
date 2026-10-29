import { patternLesson } from './patterns';
export const lessonBooks = [patternLesson];
export const getLessonBook = (themeId: string) => lessonBooks.find(book => book.themeId === themeId);
