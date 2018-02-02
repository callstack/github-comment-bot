# GitHub Comment Bot

Bot to comment on GitHub pull requests.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## Setup

1. Create a bot account on [GitHub](https://github.com/join).
2. Generate a personal access token with the `public_repo` scope from the bot account.
3. Make sure the following environment variables are available:
    - `PORT`: Port to run the server
    - `GH_AUTH_TOKEN`: Access token for GitHub.
    - `GH_REPO_OWNER`: Organization or username on whose repos the bot can comment.
    - `GH_COMMENT_AUTHOR`: Username of the bot.
4. Run `yarn` to install the dependencies.
5. Run `yarn start` to start the server.

## API

To comment on a pull request, send a `POST` request to the `/comment` endpoint with JSON data including `pull_request` and `body` properties:

```sh
curl \
  -d '{"pull_request": "https://github.com/username/reponame/pull/123", "body": "It works!"}' \
  -H "Content-Type: application/json"\
  -X POST http://localhost:3024/comment
```

The JSON data can have the following properties

- `pull_request` (required): Link to the pull request on which to comment.
- `test`: An object with the shape `{ type: "string", data: "Some string" }` or `{ type: "regex", data: "/^Some/" }` to test against existing comments to determine if it should be a new comment or should be skipped.
- `update`: Boolean to update the existing comment instead of skipping it.

Made with ❤️.
