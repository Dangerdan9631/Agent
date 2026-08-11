import { z } from "zod";

import { ReadingListItem } from "./ReadingListItem.js";

/** Validates the library's bounded in-memory item count. */
const readingListCapacitySchema = z.number().int().positive().max(100);

/**
 * Creates and retains reading-list items behind a small reusable library API.
 */
export class ReadingList {
  readonly #items: ReadingListItem[] = [];

  /**
   * Creates an empty reading list with a bounded capacity.
   *
   * @param capacity - Maximum item count from one through one hundred.
   */
  public constructor(private readonly capacity: number = 100) {
    readingListCapacitySchema.parse(capacity);
  }

  /**
   * Adds a normalized title to the list.
   *
   * @param title - User-supplied book title.
   * @returns The created reading-list item.
   */
  public add(title: string): ReadingListItem {
    if (this.#items.length >= this.capacity)
      throw new Error("Reading list capacity reached.");
    const item = ReadingListItem.create(title);
    this.#items.push(item);
    return item;
  }
}
