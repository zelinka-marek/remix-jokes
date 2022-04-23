import type { Joke } from "@prisma/client";
import { Form, Link } from "@remix-run/react";

export default function JokeDisplay({
  joke,
  isOwner,
  isDeleting = false,
  canDelete = true,
}: {
  joke: Pick<Joke, "name" | "content">;
  isOwner: boolean;
  isDeleting?: boolean;
  canDelete?: boolean;
}) {
  return (
    <div>
      <p>Here's your hilarious joke:</p>
      <p>{joke.content}</p>
      <Link to=".">{joke.name} Permalink</Link>
      {isOwner ? (
        <Form method="post">
          <input type="hidden" name="intent" value="delete" />
          <button
            type="submit"
            className="button"
            disabled={isDeleting || !canDelete}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </Form>
      ) : null}
    </div>
  );
}
