"""Rokid Cloud notification adapter. Importing this module never sends a message.

Use only for a user who has explicitly subscribed. No public HTTP send endpoint.
Caller owns durable deduplication and records a successful response, not an attempt.
"""
import hashlib
import json
import os
import urllib.request
from .jma import age

ENDPOINT = 'https://rcs.rokid.com/metis/callback/message'


def build_notification(alert, account_id, agent_id):
    if alert.get('status') != '通常' or alert.get('infoType') not in ('発表','訂正'):
        raise ValueError('only verified normal reports can notify')
    if not alert.get('level') or alert['level'] < 3:
        raise ValueError('notification threshold not met')
    if not 0 <= age(alert['issuedAt']) < 600:
        raise ValueError('historical or future bulletin must not trigger a new alert')
    if not account_id or not agent_id:
        raise ValueError('recipient and agent are required')
    event_key = '|'.join([account_id,agent_id,alert['id'],alert['cityCode'],alert['kindCode']])
    message_id = 'mamori-' + hashlib.sha256(event_key.encode()).hexdigest()[:40]
    return {'message_id':message_id,'account_id':account_id,
            'message':{'agent_id':agent_id,
                       'content':f"{alert['city']}：{alert['name']}。発表 {alert['issuedAt']}。自治体の避難情報も確認してください。",
                       'tool':{'name':'pages/home/index','parameters':{'type':'object',
                               'properties':{'cityCode':alert['cityCode'],'lang':'ja'}}}}}


def send_notification(payload, *, subscribed=False, opener=urllib.request.urlopen):
    if not subscribed:
        raise ValueError('recipient subscription is required')
    token = os.environ.get('ROKID_SK','')
    if not token:
        raise ValueError('ROKID_SK is missing')
    request=urllib.request.Request(ENDPOINT,data=json.dumps(payload,ensure_ascii=False).encode(),
            headers={'Content-Type':'application/json','Authorization':'Bearer '+token},method='POST')
    with opener(request,timeout=10) as response:
        result=json.load(response)
    if result.get('code') != 1 or result.get('data',{}).get('success') is not True:
        raise RuntimeError('Rokid did not confirm notification success')
    return {'delivered':True,'messageId':payload['message_id'],'receiptId':result.get('uuid')}
