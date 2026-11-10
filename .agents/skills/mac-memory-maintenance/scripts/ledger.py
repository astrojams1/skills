#!/usr/bin/env python3
"""Append one machine-readable skill activity event from a JSON file/stdin."""
import datetime, fcntl, gzip, json, os, sys, uuid
from pathlib import Path

ROOT = Path.home()/'Library/Application Support/AgentActivityLedger'

def append(event):
    os.umask(0o077); ROOT.mkdir(parents=True,exist_ok=True,mode=0o700)
    event={'v':1,'ts':datetime.datetime.now(datetime.timezone.utc).isoformat(),**event}
    for key in ('run_id','skill','agent','event','status'):
        if key not in event: raise ValueError('Missing '+key)
    if event['event'] not in ('start','action','finding','verify','end'): raise ValueError('Invalid event')
    payload=(json.dumps(event,separators=(',',':'),ensure_ascii=True)+'\n').encode()
    if len(payload)>16384: raise ValueError('Event exceeds 16 KiB; link to artifact')
    with (ROOT/'.lock').open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX)
        path=ROOT/'events.jsonl'
        if path.exists() and path.stat().st_size>8*1024**2:
            archive=ROOT/('events-'+datetime.datetime.now().strftime('%Y%m%dT%H%M%S')+'-'+uuid.uuid4().hex[:8]+'.jsonl.gz')
            with path.open('rb') as src,gzip.open(archive,'wb') as dest:
                import shutil
                shutil.copyfileobj(src,dest)
            path.unlink()
        fd=os.open(path,os.O_APPEND|os.O_WRONLY|os.O_CREAT,0o600)
        try: os.write(fd,payload); os.fsync(fd)
        finally: os.close(fd)
    return event

if __name__=='__main__':
    source=open(sys.argv[1]) if len(sys.argv)>1 else sys.stdin
    result=append(json.load(source)); print(json.dumps({'recorded':True,'run_id':result['run_id']}))
