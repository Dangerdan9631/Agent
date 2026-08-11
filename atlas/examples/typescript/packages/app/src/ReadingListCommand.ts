import { ReadingList } from "@atlas-example/lib/ReadingList";
import type { ReadingListItem } from "@atlas-example/lib/ReadingListItem";
import { formatISO } from "date-fns";
import { z } from "zod";

/** Validates the executable's required title argument. */
const commandTitleSchema = z
  .string()
  .trim()
  .min(1, "A book title is required.");

/**
 * Handles one reading-list command and writes its normalized result.
 */
export class ReadingListCommand {
  /**
   * Creates a command from its reusable library and process output boundary.
   *
   * @param readingList - Library behavior that owns item creation.
   * @param output - Writable process stream receiving designed user output.
   */
  public constructor(
    private readonly readingList: ReadingList,
    private readonly output: NodeJS.WritableStream,
  ) {}

  /**
   * Adds one title and reports its normalized title and stable slug.
   *
   * @param title - Raw title supplied by the user.
   * @returns The created public library item.
   */
  public execute(title: string): ReadingListItem {
    const item = this.readingList.add(commandTitleSchema.parse(title));
    const date = formatISO(new Date(), { representation: "date" });
    this.output.write(`${item.title} | ${item.slug} | ${date}\n`);
    return item;
  }
}
