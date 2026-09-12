"""Area-bound public JMA event details. Observation is never treated as EEW."""
import concurrent.futures
import re
from .jma import xml_root, text, report_meta, age


def base(root,url,hazard):
    return {**report_meta(root,url),'hazard':hazard,'eventId':text(root,'Head/EventID'),
            'headline':text(root,'Head/Headline/Text'),'metrics':[], 'arrivalAt':None,
            'arrivalBasis':None,'scope':'unconfirmed','activeState':'unverified'}


def parse_event(raw,city,url,coast=''):
    root=xml_root(raw)
    if text(root,'Control/Status')!='通常' or text(root,'Head/InfoType') not in ('発表','訂正'):
        return []
    if '_VXSE53_' in url:
        e=base(root,url,'earthquake')
        c=next((n for n in root.findall('Body/Intensity/Observation/Pref/Area/City') if text(n,'Code')==city['code']),None)
        if c is None:return []
        intensity=text(c,'MaxInt')
        e.update(name='地震・震度情報',scope='municipality',cityCode=city['code'],city=city['name'],intensity=intensity,
                 activeState='observed',occurredAt=text(root,'Body/Earthquake/OriginTime'))
        e['metrics']=[{'label':'観測震度 / 实测震度','value':intensity},{'label':'地震規模 / 震级','value':'M '+text(root,'Body/Earthquake/Magnitude')},
                      {'label':'震源','value':text(root,'Body/Earthquake/Hypocenter/Area/Name')}]
        e['timingNote']='発生後の観測情報。揺れの到達予測ではありません / 震后实测，非倒计时预警'
        return [e]
    if '_VTSE41_' in url:
        output=[]
        for item in root.findall('Body/Tsunami/Forecast/Item'):
            area=text(item,'Area/Name');kind=text(item,'Category/Kind/Name')
            if not coast or area!=coast:continue
            e=base(root,url,'tsunami');e.update(name=kind,scope='confirmed-coast',cityCode=city['code'],city=area,coast=area)
            code=text(item,'Category/Kind/Code')
            if '解除' in kind or code=='00':e['activeState']='cancelled'
            else:e['activeState']='reported'
            arrival=text(item,'FirstHeight/ArrivalTime')
            e['arrivalAt']=arrival or None;e['arrivalBasis']='jma-tsunami-first-arrival' if arrival else None
            first=text(item,'FirstHeight/Condition');height=item.find('MaxHeight/TsunamiHeight')
            h=(height.get('description') or height.text or '') if height is not None else text(item,'MaxHeight/Condition')
            e['metrics']=[{'label':'予想津波高 / 预计海啸高度','value':h or '未発表 / 未发布'},{'label':'対象沿岸 / 对应沿岸','value':area}]
            e['timingNote']=first or '最早到達予想。待たずに避難 / 最早预计到达，不要等待倒计时'
            output.append(e)
        return output
    if '_VFVO50_' in url:
        matches=[]
        for info in root.findall('Body/VolcanoInfo'):
            if '対象市町村等' not in info.get('type',''):continue
            for item in info.findall('Item'):
                if any(text(a,'Code')==city['code'] for a in item.findall('Areas/Area')):matches.append(item)
        if not matches:return []
        e=base(root,url,'volcano');e.update(name=text(root,'Head/Title'),scope='municipality',cityCode=city['code'],city=city['name'],activeState='reported')
        item=next((i for v in root.findall('Body/VolcanoInfo') if '対象火山' in v.get('type','') for i in v.findall('Item')),None)
        kind=text(item,'Kind/Name') if item is not None else ''
        volcano=text(item,'Areas/Area/Name') if item is not None else ''
        e['metrics']=[{'label':'対象火山 / 对应火山','value':volcano},{'label':'警戒区分 / 警戒类别','value':kind or '未発表 / 未发布'}]
        # Only a level explicitly written by JMA is exposed as a volcano level.
        level=re.search(r'レベル\s*([1-5１-５])',kind)
        e['volcanoLevel']=int(level[1]) if level else None
        e['timingNote']='噴火の時刻は予測しません / 不预测喷发时间'
        if any('解除' in text(i,'Kind/Name') or '活火山であることに留意' in text(i,'Kind/Name') for i in matches):e['activeState']='cancelled'
        return [e]
    return []


def local_events(service,city,coast=''):
    chosen={}
    for e in service.feed('eqvol'):
        # One latest revision per earthquake/volcano; tsunami is one full snapshot.
        if not any('_'+code+'_' in e['id'] for code in ('VXSE53','VTSE41','VFVO50')):continue
        if '_VXSE53_' in e['id'] and age(e['issuedAt'])>86400:continue
        key='tsunami' if '_VTSE41_' in e['id'] else e['title']
        # Earthquake titles repeat: keep the latest few bulletins for area matching.
        if '_VXSE53_' in e['id']:key=e['id']
        if key not in chosen:chosen[key]=e
        if len(chosen)>=30:break
    parsed=[];errors=[]
    def read(e):
        raw=service.cache.get(e['id'],86400*30);root=xml_root(raw)
        # Keep cancellation metadata too so an old earthquake revision cannot return.
        return text(root,'Head/EventID'),text(root,'Head/InfoKind'),e['issuedAt'],parse_event(raw,city,e['id'],coast)
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        for future in concurrent.futures.as_completed([pool.submit(read,e) for e in chosen.values()]):
            try:parsed.append(future.result())
            except Exception:errors.append('event-source-unavailable')
    latest={}
    for event_id,kind,issued,rows in sorted(parsed,key=lambda r:r[2],reverse=True):
        key=(kind,event_id)
        if key not in latest:latest[key]=rows
    return {'items':[e for rows in latest.values() for e in rows], 'errors':errors,'coverage':'partial',
            'eew':'not-connected','coast':coast,'note':'公開XMLの発表記録。全有効警報の一覧ではありません / 公开发布记录，非完整有效预警清单'}
