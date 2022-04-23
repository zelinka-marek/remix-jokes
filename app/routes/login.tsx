import type {
  ActionFunction,
  LinksFunction,
  MetaFunction,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useSearchParams,
  useTransition,
} from "@remix-run/react";
import * as React from "react";

import stylesUrl from "~/styles/login.css";
import { db } from "~/utils/db.server";
import { createUserSession, login, register } from "~/utils/session.server";

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesUrl }];
};

export const meta: MetaFunction = () => {
  return {
    title: "Login | Remix Jokes",
    description: "Login to submit your own jokes to Remix Jokes!",
  };
};

function validateUsername(username: unknown) {
  if (typeof username !== "string" || username.length < 3) {
    return "Usernames must be at least 3 characters long";
  }
}

function validatePassword(password: unknown) {
  if (typeof password !== "string" || password.length < 6) {
    return "Passwords must be at least 6 characters long";
  }
}

type ActionData = {
  formError?: string;
  fieldErrors?: {
    username: string | undefined;
    password: string | undefined;
  };
  fields?: { loginType: string; username: string; password: string };
};

const badRequest = (data: ActionData) => json(data, { status: 400 });

export const action: ActionFunction = async ({ request }) => {
  await new Promise((res) => setTimeout(res, 1600));
  const formData = await request.formData();
  const redirectTo = formData.get("redirectTo") || "/jokes";
  const loginType = formData.get("loginType");
  const username = formData.get("username");
  const password = formData.get("password");

  if (
    typeof redirectTo !== "string" ||
    typeof loginType !== "string" ||
    typeof username !== "string" ||
    typeof password !== "string"
  ) {
    return badRequest({ formError: "Form not submitted correctly." });
  }

  const fieldErrors: ActionData["fieldErrors"] = {
    username: validateUsername(username),
    password: validatePassword(password),
  };
  const fields: ActionData["fields"] = { username, password, loginType };
  if (Object.values(fieldErrors).some(Boolean)) {
    return json<ActionData>({ fieldErrors, fields });
  }

  switch (loginType) {
    case "login": {
      const user = await login({ username, password });
      if (!user) {
        return badRequest({
          fields,
          formError: "Username/password combination is incorrect.",
        });
      }

      return createUserSession(user.id, redirectTo);
    }
    case "register": {
      const userExists = await db.user.findFirst({ where: { username } });
      if (userExists) {
        return badRequest({
          fields,
          formError: `User with username ${username} already exists`,
        });
      }

      const user = await register({ username, password });

      return createUserSession(user.id, redirectTo);
    }
    default:
      return badRequest({ fields, formError: "Login type invalid" });
  }
};

export default function LoginRoute() {
  const actionData = useActionData<ActionData>();
  const [searchParams] = useSearchParams();
  const usernameRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const transition = useTransition();
  const isSubmitting = Boolean(transition.submission);

  React.useEffect(() => {
    if (actionData?.fieldErrors?.username) {
      usernameRef.current?.focus();
    } else if (actionData?.fieldErrors?.password) {
      passwordRef.current?.focus();
    }
  }, [actionData?.fieldErrors]);

  return (
    <div className="container">
      <div className="content" data-light="">
        <h1>Login</h1>
        <Form
          method="post"
          aria-describedby={actionData?.formError ? "form-error" : undefined}
        >
          <input
            type="hidden"
            name="redirectTo"
            value={searchParams.get("redirectTo") ?? undefined}
          />
          <fieldset>
            <legend className="sr-only">Login or Register?</legend>
            <label>
              <input
                type="radio"
                defaultChecked={
                  !actionData?.fields?.loginType ||
                  actionData?.fields?.loginType === "login"
                }
                name="loginType"
                value="login"
              />{" "}
              Login
            </label>
            <label>
              <input
                type="radio"
                defaultChecked={actionData?.fields?.loginType === "register"}
                name="loginType"
                value="register"
              />{" "}
              Register
            </label>
          </fieldset>
          <div>
            <label htmlFor="username">Username</label>
            <input
              ref={usernameRef}
              type="text"
              defaultValue={actionData?.fields?.username}
              name="username"
              id="username"
              aria-invalid={
                Boolean(actionData?.fieldErrors?.username) || undefined
              }
              aria-errormessage={
                actionData?.fieldErrors?.username ? "username-error" : undefined
              }
            />
            {actionData?.fieldErrors?.username ? (
              <p
                className="form-validation-error"
                role="alert"
                id="username-error"
              >
                {actionData.fieldErrors.username}
              </p>
            ) : null}
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              ref={passwordRef}
              type="password"
              defaultValue={actionData?.fields?.password}
              name="password"
              id="password"
              aria-invalid={
                Boolean(actionData?.fieldErrors?.password) || undefined
              }
              aria-errormessage={
                actionData?.fieldErrors?.password ? "password-error" : undefined
              }
            />
            {actionData?.fieldErrors?.password ? (
              <p
                className="form-validation-error"
                role="alert"
                id="password-error"
              >
                {actionData.fieldErrors.password}
              </p>
            ) : null}
          </div>
          <div id="form-error-message">
            {actionData?.formError ? (
              <p className="form-validation-error" role="alert" id="form-error">
                {actionData.formError}
              </p>
            ) : null}
          </div>
          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
        </Form>
      </div>
      <div className="links">
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/jokes">Jokes</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
