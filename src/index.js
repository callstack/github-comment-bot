const Koa = require('koa');
const Router = require('koa-router');
const parser = require('koa-bodyparser');
const logger = require('koa-logger');
const github = require('octonode');

const app = new Koa();
const router = new Router();

router.post('/comment', async ctx => {
  const options = ctx.request.body;

  const client = github.client(process.env.GH_AUTH_TOKEN);
  const ghissue = client.issue(
    `${options.user}/${options.repo}`,
    parseInt(options.pull_request.split('/').pop(), 10)
  );

  try {
    const result = await new Promise((resolve, reject) =>
      ghissue.comments((e, r) => {
        if (e) {
          reject(e);
        } else {
          resolve(r);
        }
      })
    );

    if (result.some(r => r.body === options.body)) {
      console.log('Comment already posted. Skipping.');

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
    ctx.body = '';
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
