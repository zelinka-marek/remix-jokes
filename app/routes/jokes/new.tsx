import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { redirect, json } from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useCatch,
  useTransition,
} from "@remix-run/react";
import * as React from "react";

import { db } from "~/utils/db.server";
import { getUserId, requireUserId } from "~/utils/session.server";
import JokeDisplay from "~/components/joke";

function validateJokeName(name: string) {
  if (name.length < 3) {
    return "That joke's name is too short";
  }
}

function validateJokeContent(content: string) {
  if (content.length < 10) {
    return "That joke is too short";
  }
}

type ActionData = {
  formError?: string;
  fieldErrors?: {
    name: string | undefined;
    content: string | undefined;
  };
  fields?: { name: string; content: string };
};

const badRequest = (data: ActionData) => json(data, { status: 400 });

export const action: ActionFunction = async ({ request }) => {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const name = formData.get("name");
  const content = formData.get("content");

  if (typeof name !== "string" || typeof content !== "string") {
    return badRequest({ formError: "Form not submitted correctly." });
  }

  const fieldErrors: ActionData["fieldErrors"] = {
    name: validateJokeName(name),
    content: validateJokeContent(content),
  };
  const fields: ActionData["fields"] = { name, content };
  if (Object.values(fieldErrors).some(Boolean)) {
    return json<ActionData>({ fieldErrors, fields });
  }

  const joke = await db.joke.create({
    data: { jokesterId: userId, ...fields },
  });

  return redirect(`/jokes/${joke.id}`);
};

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await getUserId(request);
  if (!userId) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return json({});
};

export default function NewJokeRoute() {
  const actionData = useActionData<ActionData>();
  const nameRef = React.useRef<HTMLInputElement>(null);
  const contentRef = React.useRef<HTMLTextAreaElement>(null);
  const transition = useTransition();

  React.useEffect(() => {
    if (actionData?.fieldErrors?.name) {
      nameRef.current?.focus();
    } else if (actionData?.fieldErrors?.content) {
      contentRef.current?.focus();
    }
  }, [actionData?.fieldErrors]);

  if (transition.submission) {
    const name = transition.submission.formData.get("name");
    const content = transition.submission.formData.get("content");

    if (
      typeof name === "string" &&
      typeof content === "string" &&
      !validateJokeName(name) &&
      !validateJokeContent(content)
    ) {
      return (
        <JokeDisplay
          joke={{ name: name, content: content }}
          isOwner
          canDelete={false}
        />
      );
    }
  }

  return (
    <div>
      <p>Add your own hilarious joke</p>
      <Form
        method="post"
        aria-describedby={actionData?.formError ? "form-error" : undefined}
      >
        <div>
          <label>
            Name:
            <input
              ref={nameRef}
              type="text"
              defaultValue={actionData?.fields?.name}
              name="name"
              aria-invalid={Boolean(actionData?.fieldErrors?.name) || undefined}
              aria-errormessage={
                actionData?.fieldErrors?.name ? "name-error" : undefined
              }
            />
          </label>
          {actionData?.fieldErrors?.name ? (
            <p className="form-validation-error" role="alert" id="name-error">
              {actionData.fieldErrors.name}
            </p>
          ) : null}
        </div>
        <div>
          <label>
            Content:{" "}
            <textarea
              ref={contentRef}
              defaultValue={actionData?.fields?.content}
              name="content"
              aria-invalid={
                Boolean(actionData?.fieldErrors?.content) || undefined
              }
              aria-errormessage={
                actionData?.fieldErrors?.content ? "content-error" : undefined
              }
            />
            {actionData?.fieldErrors?.content ? (
              <p
                className="form-validation-error"
                role="alert"
                id="content-error"
              >
                {actionData.fieldErrors.content}
              </p>
            ) : null}
          </label>
        </div>
        <div>
          {actionData?.formError ? (
            <p className="form-validation-error" role="alert" id="form-error">
              {actionData.formError}
            </p>
          ) : null}
          <button type="submit" className="button">
            Add
          </button>
        </div>
      </Form>
    </div>
  );
}

export function CatchBoundary() {
  const caught = useCatch();

  if (caught.status === 401) {
    return (
      <div className="error-container">
        <p>You must be logged in to create a joke</p>
        <Link to="/login">Login</Link>
      </div>
    );
  }

  throw new Error(`Unexpected caught response with status: ${caught.status}`);
}

export function ErrorBoundary() {
  return (
    <div className="error-container">
      Something unexpected went wrong. Sorry about that.
    </div>
  );
}
