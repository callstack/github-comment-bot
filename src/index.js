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
    const { name, owner, filepath } = url(options.pull_request);

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

      if (result.some(r => test(r.body))) {
        console.log('Skipping posting the comment.');
        return;
      }
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
