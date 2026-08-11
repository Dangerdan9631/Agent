import { startCase, kebabCase } from "lodash-es";
import { z } from "zod";

/** Validates non-empty reading-list titles at the library boundary. */
const titleSchema = z.string().trim().min(1);

/**
 * Represents one normalized book title and its stable URL-safe slug.
 */
export class ReadingListItem {
  private constructor(
    public readonly title: string,
    public readonly slug: string,
  ) {}

  /**
   * Creates an item from user-supplied title text.
   *
   * @param title - Book title containing at least one non-whitespace character.
   * @returns A normalized immutable reading-list item.
   */
  public static create(title: string): ReadingListItem {
    const normalizedTitle = startCase(titleSchema.parse(title));
    return new ReadingListItem(normalizedTitle, kebabCase(normalizedTitle));
  }
}
