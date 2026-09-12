import json
from pathlib import Path
import unittest
from server.events import parse_event
from server.jma import municipality,DATA
from server.shelters import select_places,nearby
FIX=Path(__file__).parent/'fixtures'

class EventsTests(unittest.TestCase):
    def test_real_quake_observation_is_local_and_not_eew(self):
        raw=(FIX/'jma-quake-20260911.xml').read_bytes();url=DATA+'20260911011033_0_VXSE53_270000.xml'
        rows=parse_event(raw,municipality('4321100'),url);self.assertEqual(rows[0]['intensity'],'1');self.assertIsNone(rows[0]['arrivalAt']);self.assertEqual(rows[0]['activeState'],'observed')
        self.assertEqual(parse_event(raw,municipality('1311300'),url),[])
    def test_real_volcano_matches_named_municipality_and_preserves_non_numeric_category(self):
        raw=(FIX/'jma-volcano-20260911.xml').read_bytes();url=DATA+'20260908020012_0_VFVO50_010000.xml'
        e=parse_event(raw,municipality('1342100'),url)[0];self.assertIsNone(e['volcanoLevel']);self.assertEqual(e['metrics'][1]['value'],'火口周辺危険')
        self.assertEqual(parse_event(raw,municipality('1311300'),url),[])
    def test_tsunami_explicit_coast_time_and_cancellation(self):
        # Synthetic contract fixture, not a live warning or an official sample.
        raw='''<Report><Control><Status>通常</Status></Control><Head><InfoType>発表</InfoType></Head><Body><Tsunami><Forecast><Item><Area><Name>東京湾内湾</Name></Area><Category><Kind><Name>津波警報</Name><Code>62</Code></Kind></Category><FirstHeight><ArrivalTime>2026-09-11T11:00:00+09:00</ArrivalTime></FirstHeight><MaxHeight><TsunamiHeight description="3m">3</TsunamiHeight></MaxHeight></Item></Forecast></Tsunami></Body></Report>'''.encode()
        url=DATA+'contract_VTSE41_010000.xml';city=municipality('1311300')
        self.assertEqual(parse_event(raw,city,url),[])
        e=parse_event(raw,city,url,'東京湾内湾')[0];self.assertEqual(e['arrivalBasis'],'jma-tsunami-first-arrival');self.assertEqual(e['metrics'][0]['value'],'3m')
        cancelled=raw.replace('津波警報'.encode(),'津波注意報解除'.encode()).replace(b'<Code>62',b'<Code>00')
        self.assertEqual(parse_event(cancelled,city,url,'東京湾内湾')[0]['activeState'],'cancelled')
    def test_training_and_withdrawn_events_are_excluded(self):
        raw=(FIX/'jma-quake-20260911.xml').read_bytes();url=DATA+'20260911011033_0_VXSE53_270000.xml'
        for before,after in [('通常','訓練'),('発表','取消')]:self.assertEqual(parse_event(raw.replace(before.encode(),after.encode()),municipality('4321100'),url),[])

class ShelterTests(unittest.TestCase):
    def test_disaster_type_and_distance_filter(self):
        def f(n,d,lon=139.7):return {'geometry':{'type':'Point','coordinates':[lon,35.65]},'properties':{'name':n,**d}}
        data={'features':[f('wrong',{'disaster4':1}),f('right',{'disaster5':1,'remarks':'３階以上'}),f('far',{'disaster5':1},140.7)]}
        places=select_places([data],35.65,139.7,'tsunami');self.assertEqual(len(places),1);self.assertEqual(places[0]['remarks'],'３階以上');self.assertEqual(places[0]['openingStatus'],'unverified')
    def test_source_failure_does_not_turn_into_no_hazard_or_fake_places(self):
        def fail(_):raise OSError('offline')
        result=nearby(35.65,139.7,'earthquake',fail);self.assertEqual(result['state'],'unavailable');self.assertEqual(result['places'],[])
    def test_typhoon_requires_specific_flood_surge_or_other_shelter_type(self):
        with self.assertRaises(ValueError):nearby(35.65,139.7,'typhoon')
