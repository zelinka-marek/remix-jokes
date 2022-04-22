import type { Joke } from "@prisma/client";
import type {
  ActionFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  Form,
  Link,
  useCatch,
  useLoaderData,
  useParams,
  useTransition,
} from "@remix-run/react";

import { db } from "~/utils/db.server";
import { getUserId, requireUserId } from "~/utils/session.server";

export const meta: MetaFunction = ({
  data,
}: {
  data: LoaderData | undefined;
}) => {
  if (!data) {
    return {
      title: "No joke",
      description: "No joke found",
    };
  }

  return {
    title: `"${data.joke.name}" joke`,
    description: `Enyoj the "${data.joke.name}" joke and much more`,
  };
};

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);

  const formData = await request.formData();
  if (formData.get("intent") !== "delete") {
    throw new Response(
      `The intent ${formData.get("intent")} is not supported`,
      { status: 400 }
    );
  }

  const joke = await db.joke.findUnique({ where: { id: params.jokeId } });
  if (!joke) {
    throw new Response("Can't delete what does not exist", { status: 404 });
  }
  if (joke.jokesterId !== userId) {
    throw new Response("Pssh, nice try. That's not your joke", { status: 401 });
  }

  await db.joke.delete({ where: { id: params.jokeId } });

  return redirect("/jokes");
};

type LoaderData = {
  joke: Joke;
  isOwner: boolean;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await getUserId(request);
  const joke = await db.joke.findUnique({ where: { id: params.jokeId } });
  if (!joke) {
    throw new Response("What a joke! Not found", { status: 404 });
  }

  return json<LoaderData>({
    joke,
    isOwner: userId === joke.jokesterId,
  });
};

export default function JokeRoute() {
  const data = useLoaderData<LoaderData>();
  const transition = useTransition();
  const isDeleting = Boolean(transition.submission);

  return (
    <div>
      <p>Here's your hilarious joke:</p>
      <p>{data.joke.content}</p>
      <Link to=".">{data.joke.name} Permalink</Link>
      {data.isOwner ? (
        <Form method="post">
          <input type="hidden" name="intent" value="delete" />
          <button type="submit" className="button" disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </Form>
      ) : null}
    </div>
  );
}

export function CatchBoundary() {
  const caught = useCatch();
  const params = useParams();

  switch (caught.status) {
    case 400: {
      return (
        <div className="error-container">
          What you're trying to do is not allowed.
        </div>
      );
    }
    case 401: {
      return (
        <div className="error-container">
          Sorry, but {params.jokeId} is not your joke.
        </div>
      );
    }
    case 404: {
      return (
        <div className="error-container">
          Huh? What the heck is "{params.jokeId}"?
        </div>
      );
    }
    default: {
      throw new Error(
        `Unexpected caught response with status: ${caught.status}`
      );
    }
  }
}

export function ErrorBoundary() {
  const params = useParams();

  return (
    <div className="error-container">
      There was an error loading joke by the id {params.jokeId}
    </div>
  );
}
