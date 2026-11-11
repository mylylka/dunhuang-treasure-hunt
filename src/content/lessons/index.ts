import { patternLesson } from './patterns';
import { musicLesson } from './music';
export const lessonBooks = [patternLesson, musicLesson];
export const getLessonBook = (themeId: string) => lessonBooks.find(book => book.themeId === themeId);
