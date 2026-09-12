from contextlib import closing
import datetime as dt
import json
from pathlib import Path
import tempfile
import sqlite3
import unittest
from unittest.mock import patch
from server.jma import parse_warnings,parse_forecast,parse_feed,municipality,PublicCache,JMAService,DATA
from server.notifications import build_notification,send_notification
from server.monitor import poll

FIX=Path(__file__).parent/'fixtures'
RAW=(FIX/'jma-landslide-20260911.xml').read_bytes()
URL=DATA+'20260911022049_0_VPWW56_190000.xml'

class ParsingTests(unittest.TestCase):
    def test_real_2026_warning_city_and_level(self):
        a=parse_warnings(RAW,'1920600',URL)['alerts'];self.assertEqual(len(a),1);self.assertEqual(a[0]['level'],2)
    def test_cancellation_not_active(self):
        p=parse_warnings(RAW,'1920500',URL);self.assertTrue(p['matched']);self.assertEqual(p['alerts'],[])
    def test_no_cross_city_leak(self):
        p=parse_warnings(RAW,'1311300',URL);self.assertFalse(p['matched']);self.assertEqual(p['alerts'],[])
    def test_drill_is_excluded(self):
        self.assertEqual(parse_warnings(RAW.replace('通常'.encode(),'訓練'.encode()),'1920600',URL)['alerts'],[])
    def test_withdrawal_cannot_resurrect_old_warning(self):
        p=parse_warnings(RAW.replace('<InfoType>発表'.encode(),'<InfoType>取消'.encode()),'1920600',URL);self.assertTrue(p['withdrawn']);self.assertFalse(p['matched'])
    def test_correction_is_supported(self):
        self.assertEqual(len(parse_warnings(RAW.replace('<InfoType>発表'.encode(),'<InfoType>訂正'.encode()),'1920600',URL)['alerts']),1)
    def test_forecast_uses_exact_region(self):
        raw=(FIX/'jma-forecast-20260911.xml').read_bytes();f=parse_forecast(raw,'130010','test');self.assertEqual(f['days'][0]['condition'],'雨時々止む');self.assertIsNone(parse_forecast(raw,'999999','test'))
    def test_invalid_city_rejected(self):
        with self.assertRaises(ValueError):municipality('Tokyo')
    def test_forecast_admin_chain(self):
        self.assertEqual(municipality('1311300')['forecastCode'],'130010')
    def test_feed_rejects_external_links(self):
        f=parse_feed(b'<feed><entry><id>https://evil.example/x.xml</id></entry></feed>');self.assertEqual(f['entries'],[])
    def test_entity_xml_is_rejected(self):
        with self.assertRaises(ValueError):parse_feed(b'<!DOCTYPE x [<!ENTITY y "z">]><feed/>')
    def test_cache_no_repeat_bulletin(self):
        with tempfile.TemporaryDirectory() as d:
            calls=[];c=PublicCache(d,lambda url:calls.append(url) or RAW);c.get(URL,3600);c.get(URL,3600);self.assertEqual(len(calls),1)
    def test_source_allowlist(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(ValueError):PublicCache(d).get('http://127.0.0.1/secret',60)
    def test_source_failure_remains_unknown(self):
        class BadCache:
            def get(self,*_):raise OSError('offline')
        s=JMAService(BadCache()).snapshot('1311300');self.assertEqual(s['dataState'],'unavailable');self.assertIsNone(s['warnings']);self.assertEqual({e['service'] for e in s['errors']},{'forecast','warnings','national','events'})

class NotificationTests(unittest.TestCase):
    def alert(self):
        return {'id':URL,'cityCode':'1920600','city':'大月市','kindCode':'30','name':'レベル３土砂災害警報',
          'status':'通常','infoType':'発表','level':3,'issuedAt':dt.datetime.now(dt.timezone.utc).isoformat()}
    def test_deterministic_recipient_scoped_id(self):
        a=self.alert();p=build_notification(a,'a','agent');self.assertEqual(p,build_notification(a,'a','agent'));self.assertNotEqual(p['message_id'],build_notification(a,'b','agent')['message_id']);self.assertEqual(p['message']['tool']['parameters']['properties']['cityCode'],'1920600')
    def test_old_message_not_pushed(self):
        a=self.alert();a['issuedAt']='2000-01-01T00:00:00+00:00'
        with self.assertRaises(ValueError):build_notification(a,'a','agent')
    def test_needs_subscription(self):
        with self.assertRaises(ValueError):send_notification({})
    def test_failed_business_response_not_delivery(self):
        import io
        with patch.dict('os.environ',{'ROKID_SK':'unit-test-only'}):
            with self.assertRaises(RuntimeError):send_notification({},subscribed=True,opener=lambda *a,**k:io.StringIO('{"code":1,"data":{"success":false}}'))
    def test_monitor_dry_run_and_delivered_idempotence(self):
        alert=self.alert()
        class Source:
            def snapshot(self,city):return {'errors':[],'warnings':{'state':'fetched','alerts':[alert]}}
        with closing(sqlite3.connect(':memory:')) as db:
            db.execute('CREATE TABLE outbox(id TEXT PRIMARY KEY,payload TEXT,delivered INTEGER)')
            with patch('server.monitor.send_notification') as send:
                self.assertEqual(poll(Source(),'1920600',db)['state'],'dry-run');send.assert_not_called()
                self.assertEqual(poll(Source(),'1920600',db,send=True,subscribed=True)['delivered'],1)
                self.assertEqual(poll(Source(),'1920600',db,send=True,subscribed=True)['delivered'],0)
                send.assert_called_once()
    def test_monitor_partial_source_does_not_send(self):
        class Source:
            def snapshot(self,city):return {'errors':[],'warnings':{'state':'partial','alerts':[]}}
        with closing(sqlite3.connect(':memory:')) as db:
            self.assertEqual(poll(Source(),'1920600',db,send=True,subscribed=True)['state'],'source-unconfirmed')

if __name__=='__main__':unittest.main()
