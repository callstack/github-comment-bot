const Koa = require('koa');
const Router = require('koa-router');
const parser = require('koa-bodyparser');
const logger = require('koa-logger');
const github = require('octonode');
const mustache = require('mustache');
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

    if (!options.template) {
      ctx.status = 400;
      ctx.body = 'Comment template is not specified.';

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
    const ghpr = client.pr(`${owner}/${name}`, parseInt(filepath, 10));

    const comments = await new Promise((resolve, reject) =>
      ghissue.comments((e, r) => {
        if (e) {
          reject(e);
        } else {
          resolve(r);
        }
      })
    );

    const pr = await new Promise((resolve, reject) =>
      ghpr.info((e, r) => {
        if (e) {
          reject(e);
        } else {
          resolve(r);
        }
      })
    );

    const text = mustache.render(options.template, pr);

    if (options.test) {
      const test =
        options.test.type === 'regex'
          ? t => new RegExp(options.test.data).test(t)
          : t => t.includes(options.test.data);

      const comment = comments.find(
        r => test(r.body) && r.user.login === process.env.GH_COMMENT_AUTHOR
      );

      if (comment) {
        if (options.update && comment.body !== text) {
          console.log(`Updating comment in ${options.pull_request}.`);

          await new Promise((resolve, reject) =>
            ghissue.updateComment(
              comment.id,
              {
                body: text,
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

        return;
      }
    }

    console.log(`Posting comment "${text}" in ${options.pull_request}.`);

    await new Promise((resolve, reject) =>
      ghissue.createComment(
        {
          body: text,
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
