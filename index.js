const functions = require('firebase-functions');
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const crypto = require('crypto');

const app = express();
const website = "https://femrico.com";

const rawBodySaver = (req, res, buf, encoding) => {
    if (buf && buf.length) {
        req.rawBody = buf.toString(encoding || 'utf8');
    }
};

app.use(bodyParser.json({ verify: rawBodySaver }));
app.use(bodyParser.urlencoded({ verify: rawBodySaver, extended: true }));
app.use(bodyParser.raw({ verify: rawBodySaver, type: '*/*' }));

function buildSlackMessage(body) {
    return {
        "text": ":tada: You Got a New Order!",
        "attachments": [
            {
                "color": "#36a64f",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `Order <${website}/wp-admin/post.php?post=${body.id}&action=edit|#${body.id}>`
                        }
                    },
                    {
                        "type": "divider"
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": `${body.line_items[0].name}\n\n*$${body.total}*`
                        }
                    }
                ]
            }
        ]
    };
}

app.post('/order', (req, res, next) => {
    const secret = functions.config().woo.order_webhook;
    const signature = req.header("X-WC-Webhook-Signature");

    const hash = crypto.createHmac('SHA256', secret).update(req.rawBody).digest('base64');

    if (hash === signature) {

        postData = buildSlackMessage(req.body);

        var slackMessageReq = {
            uri: functions.config().slack.order_message_url,
            body: JSON.stringify(postData),
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }

        request(slackMessageReq, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                res.send(200);
            } else {
                res.send(500);
            }
        })

    } else {
        res.sendStatus(403);
    }
})


exports.home = functions.https.onRequest(app);

