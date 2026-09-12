"""Opt-in monitor. Dry-run is the default; no schedule or recipients are installed."""
import argparse
import json
import os
import sqlite3
import time
from .jma import JMAService, ROOT, municipality
from .notifications import build_notification, send_notification


def poll(service, city, db, *, send=False, subscribed=False):
    snapshot=service.snapshot(city)
    warnings=snapshot['warnings']
    if snapshot['errors'] or not warnings or warnings['state']!='fetched':
        return {'state':'source-unconfirmed','prepared':0,'delivered':0}
    account=os.environ.get('ROKID_ACCOUNT_ID','preview-recipient')
    agent=os.environ.get('ROKID_AGENT_ID','preview-agent')
    counts={'state':'dry-run' if not send else 'delivery-enabled','prepared':0,'delivered':0}
    for alert in warnings['alerts']:
        try:payload=build_notification(alert,account,agent)
        except ValueError:continue
        mid=payload['message_id']
        if db.execute('SELECT delivered FROM outbox WHERE id=?',(mid,)).fetchone()==(1,):continue
        db.execute('INSERT OR IGNORE INTO outbox VALUES(?,?,0)',(mid,json.dumps(payload,ensure_ascii=False)))
        db.commit();counts['prepared']+=1
        if send:
            send_notification(payload,subscribed=subscribed)
            db.execute('UPDATE outbox SET delivered=1 WHERE id=?',(mid,));db.commit();counts['delivered']+=1
    return counts


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--city',required=True,help='Confirmed JMA municipality code')
    parser.add_argument('--once',action='store_true')
    parser.add_argument('--send',action='store_true',help='Actually send to the configured subscribed user')
    parser.add_argument('--subscribed',action='store_true',help='Confirm recipient has opted in')
    args=parser.parse_args();municipality(args.city)
    if args.send and (not args.subscribed or any(not os.environ.get(k) for k in ['ROKID_SK','ROKID_ACCOUNT_ID','ROKID_AGENT_ID'])):
        parser.error('sending requires opted-in recipient and all three ROKID environment variables')
    directory=ROOT/'.cache';directory.mkdir(exist_ok=True)
    db=sqlite3.connect(directory/'notification-outbox.sqlite')
    db.execute('CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY,payload TEXT,delivered INTEGER)')
    service=JMAService()
    while True:
        try:print(json.dumps(poll(service,args.city,db,send=args.send,subscribed=args.subscribed)),flush=True)
        except Exception as exc:print(json.dumps({'state':'failed','error':type(exc).__name__}),flush=True)
        if args.once:break
        time.sleep(60)
    db.close()


if __name__=='__main__':main()
