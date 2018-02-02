const Koa = require('koa');
const Router = require('koa-router');
const parser = require('koa-bodyparser');
const logger = require('koa-logger');
const github = require('octonode');
const url = require('parse-github-url');

const app = new Koa();
const router = new Router();

router.post('/comment', async ctx => {
  const options = ctx.request.body;

  console.log(`Received request for posting: ${JSON.stringify(options)}`);

  try {
    if (!options.pull_request) {
      ctx.status = 400;
      ctx.body = 'Pull request URL not specified.';

      return;
    }

    if (!options.body) {
      ctx.status = 400;
      ctx.body = 'Comment body is not specified.';

      return;
    }

    const { name, owner, filepath } = url(options.pull_request);

    if (!name || !owner || !filepath) {
      ctx.status = 400;
      ctx.body = 'Invalid pull request URL.';

      return;
    }

    if (owner !== process.env.GH_REPO_OWNER) {
      ctx.status = 403;
      ctx.body = 'Not allowed to comment on the pull request.';

      return;
    }

    const client = github.client(process.env.GH_AUTH_TOKEN);
    const ghissue = client.issue(`${owner}/${name}`, parseInt(filepath, 10));

    const result = await new Promise((resolve, reject) =>
      ghissue.comments((e, r) => {
        if (e) {
          reject(e);
        } else {
          resolve(r);
        }
      })
    );

    if (options.test) {
      const test =
        options.test.type === 'regex'
          ? text => new RegExp(options.test.data).test(text)
          : text => text.includes(options.test.data);

      const comment = result.find(
        r => test(r.body) && r.user.login === process.env.GH_COMMENT_AUTHOR
      );

      if (comment) {
        if (options.update && comment.body !== options.body) {
          console.log(`Updating comment in ${options.pull_request}.`);

          await new Promise((resolve, reject) =>
            ghissue.updateComment(
              comment.id,
              {
                body: options.body,
              },
              (e, r) => {
                if (e) {
                  reject(e);
                } else {
                  resolve(r);
                }
              }
            )
          );

          ctx.status = 200;
          ctx.body = 'Successfully updated the comment.';
        } else {
          console.log('Skipping posting the comment.');

          ctx.status = 200;
          ctx.body = 'Skipped posting the comment.';
        }
      }

      return;
    }

    console.log(
      `Posting comment "${options.body}" in ${options.pull_request}.`
    );

    await new Promise((resolve, reject) =>
      ghissue.createComment(
        {
          body: options.body,
        },
        (e, r) => {
          if (e) {
            reject(e);
          } else {
            resolve(r);
          }
        }
      )
    );

    console.log(`Successfully posted comment in ${options.pull_request}.`);

    ctx.status = 200;
    ctx.body = 'Successfully posted the comment.';
  } catch (e) {
    console.error(e);

    ctx.throw(e.message);
  }
});

app
  .use(logger())
  .use(parser())
  .use(router.routes())
  .use(router.allowedMethods());

app.listen(process.env.PORT);

console.log(`Server running at http://localhost:${process.env.PORT}`);
